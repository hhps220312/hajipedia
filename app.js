import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBq7Op5rLYSmspB1wjW-wg2N1Pz377Y0HU",
    authDomain: "hajipedia-28581.firebaseapp.com",
    projectId: "hajipedia-28581",
    storageBucket: "hajipedia-28581.firebasestorage.app",
    messagingSenderId: "900291553288",
    appId: "1:900291553288:web:2d06405641ec14c57309bd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentArticle = 'Hajipedia';
let allArticles = [];

const firstHeading = document.getElementById('firstHeading');
const bodyContent = document.getElementById('bodyContent');
const tabView = document.getElementById('tab-view');
const tabEdit = document.getElementById('tab-edit');
const searchInput = document.getElementById('search-input');
const searchSuggest = document.getElementById('search-suggest');
const searchForm = document.getElementById('search-form');

async function fetchAllArticles() {
    try {
        const snapshot = await getDocs(collection(db, "articles"));
        allArticles = snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error(error);
    }
}

function parseWikiText(text) {
    if (!text) return '';
    let html = text;

    html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(/&lt;s&gt;(.*?)&lt;\/s&gt;/g, '<s>$1</s>');
    html = html.replace(/&lt;span style="color:\s*([^"]+);"&gt;(.*?)&lt;\/span&gt;/g, '<span style="color: $1;">$2</span>');
    html = html.replace(/&lt;br&gt;/g, '<br>');

    html = html.replace(/\{\{Infobox([\s\S]*?)\}\}/g, (match, p1) => {
        let width = '300px';
        let sectionBg = '#e6e6fa';
        let sectionColor = '#222';
        let items = [];

        const lines = p1.split('\n');
        lines.forEach(line => {
            const m = line.match(/^\|\s*(.*?)\s*=\s*(.*)$/);
            if (m) {
                const key = m[1].trim();
                const val = m[2].trim();
                if (key === 'width') width = val;
                else if (key === 'section_bg') sectionBg = val;
                else if (key === 'section_color') sectionColor = val;
                else if (val) items.push({key, val});
            }
        });

        let box = `<div class="infobox" style="width: ${width};">`;
        items.forEach(item => {
            let processedVal = item.val.replace(/\[\[File:(.+?)\Vert{}inline\]\]/g, '<img src="$1" class="inline-image">');
            processedVal = processedVal.replace(/\[\[(.*?)\]\]/g, '<a href="#" class="internal-link" data-target="$1">$1</a>');

            if (item.key === 'title') box += `<div class="info-title">${processedVal}</div>`;
            else if (item.key === 'subtitle') box += `<div class="info-subtitle">${processedVal}</div>`;
            else if (item.key === 'image') box += `<img src="${processedVal}">`;
            else if (item.key === 'caption') box += `<div class="info-caption">${processedVal}</div>`;
            else if (item.key === 'section') box += `<div class="info-section" style="background-color:${sectionBg}; color:${sectionColor};">${processedVal}</div>`;
            else box += `<div class="info-row"><div class="info-th">${item.key}</div><div class="info-td">${processedVal}</div></div>`;
        });
        box += '</div>';
        return box;
    });

    html = html.replace(/\{\{MessageBox([\s\S]*?)\}\}/g, (match, p1) => {
        let borderColor = '#a2a9b1';
        let bgColor = '#f8f9fa';
        let content = '';
        const lines = p1.split('\n');
        lines.forEach(line => {
            const m = line.match(/^\|\s*(.*?)\s*=\s*(.*)$/);
            if (m) {
                const key = m[1].trim();
                const val = m[2].trim();
                if (key === 'border') borderColor = val;
                else if (key === 'bg') bgColor = val;
                else if (key === 'text') content = val;
            }
        });
        return `<div class="messagebox" style="border-color:${borderColor}; background-color:${bgColor};">${content}</div>`;
    });

    html = html.replace(/\{\| class="wikitable"([\s\S]*?)\|\}/g, (match, p1) => {
        let table = '<table class="wikitable">';
        const rows = p1.trim().split(/\|-/);
        rows.forEach(row => {
            if (!row.trim()) return;
            table += '<tr>';
            if (row.includes('!')) {
                const cells = row.split('!!');
                cells.forEach(cell => {
                    const cleanCell = cell.replace(/^!/, '').trim();
                    if(cleanCell) {
                        let styleMatch = cleanCell.match(/style="(.*?)"\|(.*)/);
                        if(styleMatch) {
                            table += `<th style="${styleMatch[1]}">${styleMatch[2].trim()}</th>`;
                        } else {
                            table += `<th>${cleanCell}</th>`;
                        }
                    }
                });
            } else {
                const cells = row.split('||');
                cells.forEach(cell => {
                    const cleanCell = cell.replace(/^\|/, '').trim();
                    if(cleanCell) {
                        let styleMatch = cleanCell.match(/style="(.*?)"\|(.*)/);
                        if(styleMatch) {
                            table += `<td style="${styleMatch[1]}">${styleMatch[2].trim()}</td>`;
                        } else {
                            table += `<td>${cleanCell}</td>`;
                        }
                    }
                });
            }
            table += '</tr>';
        });
        table += '</table>';
        return table;
    });

    const tocList = [];
    html = html.replace(/^===(.*?)===$/gm, (match, p1) => {
        const id = 'h3_' + Math.random().toString(36).substr(2, 9);
        tocList.push({ level: 3, text: p1.trim(), id: id });
        return `<h3 id="${id}">${p1}</h3>`;
    });
    html = html.replace(/^==(.*?)==$/gm, (match, p1) => {
        const id = 'h2_' + Math.random().toString(36).substr(2, 9);
        tocList.push({ level: 2, text: p1.trim(), id: id });
        return `<h2 id="${id}">${p1}</h2>`;
    });

    if (html.includes('__TOC__')) {
        if (tocList.length > 0) {
            let tocHtml = '<div class="toc"><div class="toc-title">目次</div><ul class="toc-list">';
            let currentLevel = 2;
            tocList.forEach((item, index) => {
                if (item.level > currentLevel) tocHtml += '<ul>';
                if (item.level < currentLevel) tocHtml += '</ul>';
                tocHtml += `<li><a href="#${item.id}">${index + 1}. ${item.text}</a></li>`;
                currentLevel = item.level;
            });
            while(currentLevel > 2){ tocHtml += '</ul>'; currentLevel--; }
            tocHtml += '</ul></div>';
            html = html.replace('__TOC__', tocHtml);
        } else {
            html = html.replace('__TOC__', '');
        }
    }

    html = html.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
    
    html = html.replace(/\[\[File:([^\vert{}\]]+)\Vert{}thumb\Vert{}(\d+px)\Vert{}?(左\vert{}右)?\Vert{}?(.*?)\]\]/g, (match, src, size, align, caption) => {
        const floatClass = align === '左' ? 'tleft' : 'tright';
        const capHtml = caption ? `<div class="thumbcaption">${caption}</div>` : '';
        return `<div class="thumb ${floatClass}" style="width:${parseInt(size)+8}px;"><div class="thumbinner" style="width:${size};"><img src="${src}" class="thumbimage" style="width:${size};">${capHtml}</div></div>`;
    });
    html = html.replace(/\[\[File:(.+?)\Vert{}inline\]\]/g, '<img src="$1" class="inline-image">');
    html = html.replace(/\[\[File:([^\vert{}\]]+)\]\]/g, '<img src="$1" style="max-width:100%; height:auto;">');

    html = html.replace(/\[(https?:\/\/[^\s]+)\s+(.*?)\]/g, '<a href="$1" target="_blank" class="external-link">$2</a>');
    
    html = html.replace(/\[\[(.*?)\]\]/g, (match, p1) => {
        return `<a href="#" class="internal-link" data-target="${p1}">${p1}</a>`;
    });

    let lines = html.split('\n');
    let inList = false;
    let finalHtml = '';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trimEnd();
        
        if (line.startsWith('*')) {
            if (!inList) {
                finalHtml += '<ul class="wiki-ul">\n';
                inList = true;
            }
            finalHtml += `<li>${line.substring(1).trim()}</li>\n`;
        } else {
            if (inList) {
                finalHtml += '</ul>\n';
                inList = false;
            }
            if (line === '' || line.startsWith('<') || line.startsWith('{|') || line.startsWith('|}') || line.startsWith('|-') || line.startsWith('|') || line.startsWith('!')) {
                finalHtml += line + '\n';
            } else {
                finalHtml += line + '<br>\n';
            }
        }
    }
    if (inList) finalHtml += '</ul>\n';

    return finalHtml;
}

async function loadArticle(title) {
    currentArticle = title;
    firstHeading.textContent = title;
    tabView.classList.add('selected');
    tabEdit.classList.remove('selected');
    bodyContent.innerHTML = '読み込み中...';

    try {
        const docRef = doc(db, "articles", title);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            bodyContent.innerHTML = parseWikiText(docSnap.data().content);
            attachInternalLinks();
        } else {
            bodyContent.innerHTML = '<p>このページはまだ存在しません。右上の「編集」をクリックして新規作成してください。</p>';
        }
    } catch (error) {
        bodyContent.innerHTML = `<p style="color:red; font-weight:bold;">データベースの読み込みに失敗しました。</p><p style="color:red; font-size:0.9em;">エラー詳細: ${error.message}</p>`;
    }
}

function attachInternalLinks() {
    document.querySelectorAll('.internal-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            loadArticle(e.target.getAttribute('data-target'));
        });
    });
}

async function openEditor() {
    tabView.classList.remove('selected');
    tabEdit.classList.add('selected');
    firstHeading.textContent = `「${currentArticle}」を編集中`;
    bodyContent.innerHTML = '読み込み中...'; 

    let content = '';
    
    try {
        const docRef = doc(db, "articles", currentArticle);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            content = docSnap.data().content || ''; 
        }
    } catch (error) {
        console.error(error);
    }

    bodyContent.innerHTML = `
        <div class="edit-toolbar">
            <button class="edit-btn" id="btn-bold" title="太字"><strong>B</strong></button>
            <button class="edit-btn" id="btn-strike" title="取消線"><s>S</s></button>
            <button class="edit-btn" id="btn-color" title="文字色">色</button>
            <button class="edit-btn" id="btn-link" title="内部リンク">リンク</button>
            <button class="edit-btn" id="btn-extlink" title="外部リンク">外リンク</button>
            <button class="edit-btn" id="btn-img" title="画像(枠あり)">画像</button>
            <button class="edit-btn" id="btn-img-inline" title="行内画像">行内画像</button>
            <button class="edit-btn" id="btn-h2" title="大見出し">H2</button>
            <button class="edit-btn" id="btn-h3" title="中見出し">H3</button>
            <button class="edit-btn" id="btn-list" title="箇条書き">リスト</button>
            <button class="edit-btn" id="btn-table" title="表作成">表</button>
            <button class="edit-btn" id="btn-msgbox" title="警告枠">枠</button>
            <button class="edit-btn" id="btn-toc" title="目次">目次</button>
            <button class="edit-btn" id="btn-infobox" title="インフォボックス">Info</button>
        </div>
        <textarea id="edit-textarea">${content}</textarea>
        <button id="save-btn">変更を保存</button>
    `;

    const textarea = document.getElementById('edit-textarea');
    
    function insertText(prefix, suffix) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        textarea.setRangeText(prefix + selected + suffix, start, end, 'select');
        textarea.focus();
    }

    document.getElementById('btn-bold').onclick = () => insertText("'''", "'''");
    document.getElementById('btn-strike').onclick = () => insertText("<s>", "</s>");
    document.getElementById('btn-color').onclick = () => insertText('<span style="color: red;">', '</span>');
    document.getElementById('btn-link').onclick = () => insertText("[[", "]]");
    document.getElementById('btn-extlink').onclick = () => insertText("[", " ]");
    document.getElementById('btn-img').onclick = () => insertText("[[File:", "|thumb|250px|右|画像の説明文]]");
    document.getElementById('btn-img-inline').onclick = () => insertText("[[File:", "|inline]]");
    document.getElementById('btn-h2').onclick = () => insertText("\n== ", " ==\n");
    document.getElementById('btn-h3').onclick = () => insertText("\n=== ", " ===\n");
    document.getElementById('btn-list').onclick = () => insertText("\n* ", "");
    document.getElementById('btn-toc').onclick = () => insertText("__TOC__\n", "");
    
    document.getElementById('btn-table').onclick = () => {
        const tpl = `\n{| class="wikitable"\n! 見出し1 !! 見出し2\n|-\n| style="background: #e6e6fa;"| 色付きセル || データ2\n|-\n| データ3 || データ4\n|}\n`;
        insertText(tpl, "");
    };

    document.getElementById('btn-msgbox').onclick = () => {
        const tpl = `\n{{MessageBox\n| border = red\n| bg = #ffefef\n| text = 警告メッセージ\n}}\n`;
        insertText(tpl, "");
    };

    document.getElementById('btn-infobox').onclick = () => {
        const tpl = `{{Infobox\n| width = 300px\n| title = \n| subtitle = \n| image = \n| caption = \n| section_bg = #e6e6fa\n| section_color = #222222\n| section = 基本情報\n| 項目名1 = \n| 項目名2 = \n}}\n`;
        insertText(tpl, "");
    };

    document.getElementById('save-btn').addEventListener('click', async () => {
        const saveBtn = document.getElementById('save-btn');
        saveBtn.textContent = '保存中...';
        saveBtn.disabled = true;

        try {
            const newText = textarea.value;
            await setDoc(doc(db, "articles", currentArticle), {
                content: newText,
                timestamp: new Date()
            });
            if(!allArticles.includes(currentArticle)) allArticles.push(currentArticle);
            
            loadArticle(currentArticle);
        } catch (error) {
            alert("保存に失敗しました: " + error.message);
            saveBtn.textContent = '変更を保存';
            saveBtn.disabled = false;
        }
    });
}

function showSearchResults(query) {
    tabView.classList.remove('selected');
    tabEdit.classList.remove('selected');
    firstHeading.textContent = `「${query}」の検索結果`;
    
    const results = allArticles.filter(title => title.includes(query));
    
    if (results.length === 0) {
        bodyContent.innerHTML = `<p>「${query}」に一致するページは見つかりませんでした。</p><p><a href="#" class="internal-link" data-target="${query}">${query} を新規作成する</a></p>`;
    } else {
        let html = '<ul class="search-results-list">';
        results.forEach(title => {
            html += `<li class="search-result-item"><a href="#" class="internal-link" data-target="${title}">${title}</a></li>`;
        });
        html += '</ul>';
        bodyContent.innerHTML = html;
    }
    attachInternalLinks();
    searchSuggest.style.display = 'none';
}

searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    if (!val) {
        searchSuggest.style.display = 'none';
        return;
    }
    const matches = allArticles.filter(title => title.includes(val)).slice(0, 5);
    
    if (matches.length > 0) {
        searchSuggest.innerHTML = matches.map(m => `<li>${m}</li>`).join('');
        searchSuggest.style.display = 'block';
        searchSuggest.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                searchInput.value = '';
                searchSuggest.style.display = 'none';
                loadArticle(li.textContent);
            });
        });
    } else {
        searchSuggest.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    if (!searchForm.contains(e.target)) {
        searchSuggest.style.display = 'none';
    }
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = searchInput.value.trim();
    if (!val) return;
    
    const exactMatch = allArticles.find(title => title === val);
    if (exactMatch && allArticles.filter(t => t.includes(val)).length === 1) {
        searchInput.value = '';
        searchSuggest.style.display = 'none';
        loadArticle(exactMatch);
    } else {
        searchInput.value = '';
        showSearchResults(val);
    }
});

tabView.addEventListener('click', (e) => { e.preventDefault(); loadArticle(currentArticle); });
tabEdit.addEventListener('click', (e) => { e.preventDefault(); openEditor(); });
document.getElementById('nav-main').addEventListener('click', (e) => { e.preventDefault(); loadArticle('Hajipedia'); });
document.getElementById('logo-link').addEventListener('click', (e) => { e.preventDefault(); loadArticle('Hajipedia'); });

fetchAllArticles().then(() => {
    loadArticle('Hajipedia');
});

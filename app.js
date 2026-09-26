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

    html = html.replace(/\{\{Infobox([\s\S]*?)\}\}/g, (match, p1) => {
        let box = '<div class="infobox">';
        let imgHtml = '';
        let captionHtml = '';
        let subtitleHtml = '';
        let rowsHtml = '';
        let titleHtml = '';

        const lines = p1.split('\n');
        lines.forEach(line => {
            const m = line.match(/^\|\s*(.*?)\s*=\s*(.*)$/);
            if (m) {
                const key = m[1].trim();
                const val = m[2].trim();
                if (!val) return;
                
                if (key === 'title') titleHtml = `<div class="info-title">${val}</div>`;
                else if (key === 'subtitle') subtitleHtml = `<div class="info-subtitle">${val}</div>`;
                else if (key === 'image') imgHtml = `<img src="${val}">`;
                else if (key === 'caption') captionHtml = `<div class="info-caption">${val}</div>`;
                else if (key === 'section') rowsHtml += `<div class="info-section">${val}</div>`;
                else rowsHtml += `<div class="info-row"><div class="info-th">${key}</div><div class="info-td">${val}</div></div>`;
            }
        });
        
        box += titleHtml + subtitleHtml + imgHtml + captionHtml + rowsHtml + '</div>';
        return box;
    });

    html = html.replace(/^===(.*?)===$/gm, '<h3>$1</h3>');
    html = html.replace(/^==(.*?)==$/gm, '<h2>$1</h2>');
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

    html = html.split('\n').map(line => {
        if(line.startsWith('<h') || line.startsWith('<div') || line.trim() === '') return line;
        return line + '<br>';
    }).join('\n');

    return html;
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
            <button class="edit-btn" id="btn-link" title="内部リンク">リンク</button>
            <button class="edit-btn" id="btn-extlink" title="外部リンク">外リンク</button>
            <button class="edit-btn" id="btn-img" title="画像(枠あり)">画像</button>
            <button class="edit-btn" id="btn-img-inline" title="行内画像">行内画像</button>
            <button class="edit-btn" id="btn-h2" title="大見出し">H2</button>
            <button class="edit-btn" id="btn-h3" title="中見出し">H3</button>
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
    document.getElementById('btn-link').onclick = () => insertText("[[", "]]");
    document.getElementById('btn-extlink').onclick = () => insertText("[", " ]");
    document.getElementById('btn-img').onclick = () => insertText("[[File:", "|thumb|250px|右|画像の説明文]]");
    document.getElementById('btn-img-inline').onclick = () => insertText("[[File:", "|inline]]");
    document.getElementById('btn-h2').onclick = () => insertText("== ", " ==");
    document.getElementById('btn-h3').onclick = () => insertText("=== ", " ===");
    document.getElementById('btn-infobox').onclick = () => {
        const tpl = `{{Infobox\n| title = \n| subtitle = \n| image = \n| caption = \n| section = 基本情報\n| 項目名1 = \n| 項目名2 = \n}}\n`;
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
        let html = '<ul>';
        results.forEach(title => {
            html += `<li class="search-result-item"><h3><a href="#" class="internal-link" data-target="${title}">${title}</a></h3></li>`;
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

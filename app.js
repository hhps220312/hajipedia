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
        console.error("記事一覧の取得エラー:", error);
    }
}

function parseWikiText(text) {
    if (!text) return '';
    let html = text;

    html = html.replace(/\{\{Infobox([\s\S]*?)\}\}/g, (match, p1) => {
        let box = '<div class="infobox">';
        const lines = p1.split('\n');
        lines.forEach(line => {
            const m = line.match(/^\|\s*(.*?)\s*=\s*(.*)$/);
            if (m) {
                const key = m[1].trim();
                const val = m[2].trim();
                if (!val) return;
                if (key === 'title') box += `<div class="info-title">${val}</div>`;
                else if (key === 'image') box += `<img src="${val}">`;
                else if (key === 'section') box += `<div class="info-section">${val}</div>`;
                else box += `<div class="info-row"><div class="info-th">${key}</div><div class="info-td">${val}</div></div>`;
            }
        });
        box += '</div>';
        return box;
    });

    html = html.replace(/^===(.*?)===$/gm, '<h3>$1</h3>');
    html = html.replace(/^==(.*?)==$/gm, '<h2>$1</h2>');
    html = html.replace(/'''(.*?)'''/g, '<strong>$1</strong>');
    
    html = html.replace(/\[\[File:(.+?)\Vert{}inline\]\]/g, '<img src="$1" class="inline-image">');
    html = html.replace(/\[\[File:(.+?)\]\]/g, '<img src="$1" style="max-width:100%; height:auto;">');

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
        bodyContent.innerHTML = `<p style="color:red; font-weight:bold;">データベースの読み込みに失敗しました。</p><p style="color:red; font-size:0.9em;">Firestoreの設定（ルールやデータベースの作成有無）を確認してください。<br>エラー詳細: ${error.message}</p>`;
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
            content = docSnap.data().content;
        }
    } catch (error) {
        console.error("エディタ読み込みエラー:", error);
    }

    bodyContent.innerHTML = `
        <div class="edit-toolbar">
            <button class="edit-btn" id="btn-bold" title="太字"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg></button>
            <button class="edit-btn" id="btn-link" title="内部リンク"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg></button>
            <button class="edit-btn" id="btn-extlink" title="外部リンク"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></button>
            <button class="edit-btn" id="btn-img" title="画像埋め込み"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></button>
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
    document.getElementById('btn-img').onclick = () => insertText("[[File:", "]]");
    document.getElementById('btn-h2').onclick = () => insertText("== ", " ==");
    document.getElementById('btn-h3').onclick = () => insertText("=== ", " ===");
    document.getElementById('btn-infobox').onclick = () => {
        const tpl = `{{Infobox\n| title = \n| image = \n| section = \n| 生年月日 = \n}}\n`;
        insertText(tpl, "");
    };

    document.getElementById('save-btn').addEventListener('click', async () => {
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

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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

let currentArticle = "Hajipedia";
let allArticles = [];

const firstHeading = document.getElementById("firstHeading");
const bodyContent = document.getElementById("bodyContent");
const tabView = document.getElementById("tab-view");
const tabEdit = document.getElementById("tab-edit");
const searchInput = document.getElementById("search-input");
const searchSuggest = document.getElementById("search-suggest");
const searchForm = document.getElementById("search-form");


/* =========================================================
   Firebase
========================================================= */

async function fetchAllArticles() {
    try {
        const snapshot = await getDocs(collection(db, "articles"));
        allArticles = snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("記事一覧取得エラー:", error);
    }
}


/* =========================================================
   共通処理
========================================================= */

/*
 * HTML属性に入れる文字列を最低限安全にする
 */
function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/*
 * HTML本文用のエスケープ
 *
 * 重要：
 * ここでは [[File:...]] のようなWiki記法は壊さない。
 * その後の処理でWiki記法をHTMLに変換する。
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}


/* =========================================================
   インライン要素
========================================================= */

function processInlineElements(text) {
    if (!text) {
        return "";
    }

    let processed = String(text);


    /* -----------------------------------------------------
       1. 行内画像
       
       対応例：
       [[File:other/test.png|inline]]
       [[File\:other/test.png|inline]]
       [[File：other/test.png|inline]]
       [[file:test.png | inline]]
       [[File: test.png | inline]]
    ----------------------------------------------------- */

    processed = processed.replace(
        /\[\[\s*File\s*(?:\\:|:|：)\s*([^|\]{}｜]*?)\s*(?:\||｜)\s*inline\s*\]\]/gi,
        function (match, src) {

            src = src.trim();

            if (!src) {
                return "";
            }

            return `<img src="${escapeAttribute(src)}" class="inline-image" alt="">`;
        }
    );


    /* -----------------------------------------------------
       2. thumb画像
       
       対応例：
       [[File:test.png|thumb|250px|右|説明]]
       [[File\:test.png|thumb|250px|右|説明]]
       [[File:test.png|thumb|250px|左|説明]]
       [[File:test.png|thumb|250px|250px|右|説明]]
       
       基本形：
       [[File:画像|thumb|サイズ|位置|説明]]
    ----------------------------------------------------- */

    processed = processed.replace(
        /\[\[\s*File\s*(?:\\:|:|：)\s*([^|\]{}｜]*?)\s*(?:\||｜)\s*thumb\s*(?:\||｜)\s*(\d+)\s*px\s*(?:(?:\||｜)\s*(左|右))?\s*(?:(?:\||｜)\s*(.*?))?\s*\]\]/gi,
        function (match, src, size, align, caption) {

            src = src.trim();
            size = parseInt(size, 10);

            if (!src) {
                return "";
            }

            if (!size || size < 1) {
                size = 250;
            }

            const floatClass = align === "左" ? "tleft" : "tright";

            const captionHtml = caption && caption.trim()
                ? `<div class="thumbcaption">${processInlineElements(caption.trim())}</div>`
                : "";

            return `
                <div class="thumb ${floatClass}" style="width:${size + 8}px;">
                    <div class="thumbinner" style="width:${size}px;">
                        <img
                            src="${escapeAttribute(src)}"
                            class="thumbimage"
                            style="width:${size}px;"
                            alt=""
                        >
                        ${captionHtml}
                    </div>
                </div>
            `;
        }
    );


    /* -----------------------------------------------------
       3. 内部リンク
       
       ここで初めて [[ページ名]] を処理する。
       
       画像は上の処理ですでに <img> になっているため、
       [[File:...]] が内部リンクになることはない。
    ----------------------------------------------------- */

    processed = processed.replace(
        /\[\[\s*(?!File\s*(?:\\:|:|：))([^\[\]]+?)\s*\]\]/gi,
        function (match, target) {

            target = target.trim();

            if (!target) {
                return "";
            }

            return `<a href="#" class="internal-link" data-target="${escapeAttribute(target)}">${target}</a>`;
        }
    );


    return processed;
}


/* =========================================================
   WikiText → HTML
========================================================= */

function parseWikiText(text) {

    if (!text) {
        return "";
    }

    let html = String(text);


    /* -----------------------------------------------------
       HTMLエスケープ
    ----------------------------------------------------- */

    html = escapeHtml(html);


    /* -----------------------------------------------------
       <s>
    ----------------------------------------------------- */

    html = html.replace(
        /&lt;s&gt;([\s\S]*?)&lt;\/s&gt;/gi,
        "<s>$1</s>"
    );


    /* -----------------------------------------------------
       色付き文字
    ----------------------------------------------------- */

    html = html.replace(
        /&lt;span\s+style="color:\s*([^"]+);"&gt;([\s\S]*?)&lt;\/span&gt;/gi,
        '<span style="color: $1;">$2</span>'
    );


    /* -----------------------------------------------------
       色付きボックス
    ----------------------------------------------------- */

    html = html.replace(
        /&lt;div\s+class="colored-box"\s+style="([^"]+)"&gt;([\s\S]*?)&lt;\/div&gt;/gi,
        '<div class="colored-box" style="$1">$2</div>'
    );


    /* -----------------------------------------------------
       <br>
    ----------------------------------------------------- */

    html = html.replace(
        /&lt;br\s*\/?&gt;/gi,
        "<br>"
    );


    /* =====================================================
       Infobox
    ===================================================== */

    html = html.replace(
        /\{\{Infobox([\s\S]*?)\}\}/gi,
        function (match, p1) {

            let width = "300px";
            let sectionBg = "#e6e6fa";
            let sectionColor = "#222";
            let items = [];

            const lines = p1.split("\n");

            lines.forEach(line => {

                const m = line.match(
                    /^\|\s*([^=]+?)\s*=\s*(.*)$/
                );

                if (!m) {
                    return;
                }

                const key = m[1].trim();
                const val = m[2].trim();

                if (key === "width") {
                    width = val;
                }
                else if (key === "section_bg") {
                    sectionBg = val;
                }
                else if (key === "section_color") {
                    sectionColor = val;
                }
                else if (val) {
                    items.push({
                        key: key,
                        val: val
                    });
                }
            });


            let box = `
                <div class="infobox" style="width:${escapeAttribute(width)};">
            `;


            items.forEach(item => {

                const processedVal = processInlineElements(item.val);
                const processedKey = processInlineElements(item.key);


                if (item.key === "title") {

                    box += `
                        <div class="info-title">
                            ${processedVal}
                        </div>
                    `;
                }

                else if (item.key === "subtitle") {

                    box += `
                        <div class="info-subtitle">
                            ${processedVal}
                        </div>
                    `;
                }

                else if (item.key === "image") {

                    let imgUrl = item.val.trim();


                    /*
                     * Infoboxの画像にも
                     *
                     * [[File:test.png]]
                     *
                     * [[File\:test.png]]
                     *
                     * を使用可能にする
                     */

                    const matchFile = imgUrl.match(
                        /^\[\[\s*File\s*(?:\\:|:|：)\s*([^\[\]|{}｜]+?)\s*(?:\||｜|\]\])/i
                    );

                    if (matchFile) {
                        imgUrl = matchFile[1].trim();
                    }


                    if (imgUrl) {

                        box += `
                            <img
                                src="${escapeAttribute(imgUrl)}"
                                alt=""
                            >
                        `;
                    }
                }

                else if (item.key === "caption") {

                    box += `
                        <div class="info-caption">
                            ${processedVal}
                        </div>
                    `;
                }

                else if (item.key === "section") {

                    box += `
                        <div
                            class="info-section"
                            style="background-color:${escapeAttribute(sectionBg)};color:${escapeAttribute(sectionColor)};"
                        >
                            ${processedVal}
                        </div>
                    `;
                }

                else {

                    box += `
                        <div class="info-row">
                            <div class="info-th">
                                ${processedKey}
                            </div>
                            <div class="info-td">
                                ${processedVal}
                            </div>
                        </div>
                    `;
                }
            });


            box += "</div>";

            return box;
        }
    );


    /* =====================================================
       MessageBox
    ===================================================== */

    html = html.replace(
        /\{\{MessageBox([\s\S]*?)\}\}/gi,
        function (match, p1) {

            let borderColor = "#a2a9b1";
            let bgColor = "#f8f9fa";
            let content = "";

            const lines = p1.split("\n");

            lines.forEach(line => {

                const m = line.match(
                    /^\|\s*([^=]+?)\s*=\s*(.*)$/
                );

                if (!m) {
                    return;
                }

                const key = m[1].trim();
                const val = m[2].trim();

                if (key === "border") {
                    borderColor = val;
                }
                else if (key === "bg") {
                    bgColor = val;
                }
                else if (key === "text") {
                    content = val;
                }
            });


            return `
                <div
                    class="messagebox"
                    style="border-color:${escapeAttribute(borderColor)};background-color:${escapeAttribute(bgColor)};"
                >
                    ${processInlineElements(content)}
                </div>
            `;
        }
    );


    /* =====================================================
       WikiTable
    ===================================================== */

    html = html.replace(
        /\{\|\s*class="wikitable"([\s\S]*?)\|\}/gi,
        function (match, p1) {

            let table = '<table class="wikitable">';

            const rows = p1.trim().split(/\|-/);

            rows.forEach(row => {

                if (!row.trim()) {
                    return;
                }

                table += "<tr>";


                /* -------------------------------
                   ヘッダー
                ------------------------------- */

                if (row.includes("!")) {

                    const cells = row.split("!!");

                    cells.forEach(cell => {

                        const cleanCell = cell
                            .replace(/^!/, "")
                            .trim();

                        if (!cleanCell) {
                            return;
                        }


                        const styleMatch = cleanCell.match(
                            /style="([^"]*)"\|([\s\S]*)/
                        );


                        if (styleMatch) {

                            table += `
                                <th style="${escapeAttribute(styleMatch[1])}">
                                    ${processInlineElements(styleMatch[2].trim())}
                                </th>
                            `;
                        }
                        else {

                            table += `
                                <th>
                                    ${processInlineElements(cleanCell)}
                                </th>
                            `;
                        }
                    });
                }


                /* -------------------------------
                   通常セル
                ------------------------------- */

                else {

                    const cells = row.split("||");

                    cells.forEach(cell => {

                        const cleanCell = cell
                            .replace(/^\|/, "")
                            .trim();

                        if (!cleanCell) {
                            return;
                        }


                        const styleMatch = cleanCell.match(
                            /style="([^"]*)"\|([\s\S]*)/
                        );


                        if (styleMatch) {

                            table += `
                                <td style="${escapeAttribute(styleMatch[1])}">
                                    ${processInlineElements(styleMatch[2].trim())}
                                </td>
                            `;
                        }
                        else {

                            table += `
                                <td>
                                    ${processInlineElements(cleanCell)}
                                </td>
                            `;
                        }
                    });
                }


                table += "</tr>";
            });


            table += "</table>";

            return table;
        }
    );


    /* =====================================================
       見出し・目次
    ===================================================== */

    const tocList = [];

    html = html.replace(
        /^(={2,3})\s*(.*?)\s*\1/gm,
        function (match, equals, title) {

            const level = equals.length;

            const id =
                "h" +
                level +
                "_" +
                Math.random()
                    .toString(36)
                    .substring(2, 11);

            tocList.push({
                level: level,
                text: title,
                id: id
            });

            return `
                <h${level} id="${id}">
                    ${processInlineElements(title)}
                </h${level}>
            `;
        }
    );


    /* -----------------------------------------------------
       TOC
    ----------------------------------------------------- */

    if (html.includes("__TOC__")) {

        if (tocList.length > 0) {

            let tocHtml = `
                <div class="toc">
                    <div class="toc-title">目次</div>
                    <ul class="toc-list">
            `;

            let currentLevel = 2;

            tocList.forEach((item, index) => {

                if (item.level > currentLevel) {
                    tocHtml += "<ul>";
                }

                if (item.level < currentLevel) {
                    tocHtml += "</ul>";
                }

                tocHtml += `
                    <li>
                        <a href="#${item.id}">
                            ${index + 1}. ${processInlineElements(item.text)}
                        </a>
                    </li>
                `;

                currentLevel = item.level;
            });


            while (currentLevel > 2) {
                tocHtml += "</ul>";
                currentLevel--;
            }


            tocHtml += `
                    </ul>
                </div>
            `;

            html = html.replace(
                "__TOC__",
                tocHtml
            );
        }
        else {

            html = html.replace(
                "__TOC__",
                ""
            );
        }
    }


    /* =====================================================
       太字
    ===================================================== */

    html = html.replace(
        /'''(.*?)'''/g,
        "<strong>$1</strong>"
    );


    /* =====================================================
       thumb画像
       
       重要：
       画像処理を processInlineElements に統一する。
    ===================================================== */

    html = processInlineElements(html);


    /* =====================================================
       外部リンク
    ===================================================== */

    html = html.replace(
        /\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="external-link">$2</a>'
    );


    /* =====================================================
       行処理
    ===================================================== */

    const lines = html.split("\n");

    let inList = false;
    let finalHtml = "";


    for (let i = 0; i < lines.length; i++) {

        const line = lines[i].trimEnd();


        /* -------------------------------
           箇条書き
        ------------------------------- */

        if (line.startsWith("*")) {

            if (!inList) {

                finalHtml += `
                    <ul class="wiki-ul">
                `;

                inList = true;
            }


            finalHtml += `
                <li>
                    ${line.substring(1).trim()}
                </li>
            `;
        }


        /* -------------------------------
           通常行
        ------------------------------- */

        else {

            if (inList) {

                finalHtml += `
                    </ul>
                `;

                inList = false;
            }


            /*
             * HTMLタグで始まっている行は
             * そのまま出力する。
             */

            if (
                line === "" ||
                line.startsWith("<") ||
                line.startsWith("{|") ||
                line.startsWith("|}") ||
                line.startsWith("|-") ||
                line.startsWith("|") ||
                line.startsWith("!")
            ) {

                finalHtml += line + "\n";
            }

            else {

                finalHtml += line + "<br>\n";
            }
        }
    }


    if (inList) {
        finalHtml += "</ul>\n";
    }


    return finalHtml;
}


/* =========================================================
   記事読み込み
========================================================= */

async function loadArticle(title) {

    currentArticle = title;

    firstHeading.textContent = title;

    tabView.classList.add("selected");
    tabEdit.classList.remove("selected");

    bodyContent.innerHTML = "読み込み中...";


    try {

        const docRef = doc(
            db,
            "articles",
            title
        );

        const docSnap = await getDoc(docRef);


        if (docSnap.exists()) {

            const content =
                docSnap.data().content || "";

            bodyContent.innerHTML =
                parseWikiText(content);

            attachInternalLinks();
        }

        else {

            bodyContent.innerHTML = `
                <p>
                    このページはまだ存在しません。
                    右上の「編集」をクリックして新規作成してください。
                </p>
            `;
        }
    }

    catch (error) {

        console.error(error);

        bodyContent.innerHTML = `
            <p style="color:red;font-weight:bold;">
                データベースの読み込みに失敗しました。
            </p>
            <p style="color:red;font-size:0.9em;">
                エラー詳細: ${escapeHtml(error.message)}
            </p>
        `;
    }
}


/* =========================================================
   内部リンク
========================================================= */

function attachInternalLinks() {

    document
        .querySelectorAll(".internal-link")
        .forEach(link => {

            link.addEventListener("click", function(e) {

                e.preventDefault();

                const target =
                    link.getAttribute("data-target");

                if (target) {
                    loadArticle(target);
                }
            });
        });
}


/* =========================================================
   編集画面
========================================================= */

async function openEditor() {

    tabView.classList.remove("selected");
    tabEdit.classList.add("selected");

    firstHeading.textContent =
        `「${currentArticle}」を編集中`;

    bodyContent.innerHTML = "読み込み中...";


    let content = "";


    try {

        const docRef = doc(
            db,
            "articles",
            currentArticle
        );

        const docSnap =
            await getDoc(docRef);


        if (docSnap.exists()) {

            content =
                docSnap.data().content || "";
        }
    }

    catch (error) {

        console.error(error);
    }


    bodyContent.innerHTML = `
        <div class="edit-toolbar">

            <button
                class="edit-btn"
                id="btn-bold"
                title="太字"
            >
                <strong>B</strong>
            </button>

            <button
                class="edit-btn"
                id="btn-strike"
                title="取消線"
            >
                <s>S</s>
            </button>


            <div class="color-picker-group">
                <span>文字:</span>

                <button
                    class="color-btn"
                    style="background:#000;"
                    data-cmd="color"
                    data-val="#000"
                    title="黒"
                ></button>

                <button
                    class="color-btn"
                    style="background:#f00;"
                    data-cmd="color"
                    data-val="#f00"
                    title="赤"
                ></button>

                <button
                    class="color-btn"
                    style="background:#00f;"
                    data-cmd="color"
                    data-val="#00f"
                    title="青"
                ></button>

                <button
                    class="color-btn"
                    style="background:#0a0;"
                    data-cmd="color"
                    data-val="#0a0"
                    title="緑"
                ></button>

                <button
                    class="color-btn"
                    style="background:#fa0;"
                    data-cmd="color"
                    data-val="#fa0"
                    title="オレンジ"
                ></button>

                <button
                    class="color-btn"
                    style="background:#f0f;"
                    data-cmd="color"
                    data-val="#f0f"
                    title="ピンク"
                ></button>

                <button
                    class="color-btn"
                    style="background:#808;"
                    data-cmd="color"
                    data-val="#808"
                    title="紫"
                ></button>
            </div>


            <div class="color-picker-group">
                <span>枠:</span>

                <button
                    class="color-btn"
                    style="background:#fff;border-color:#000;"
                    data-cmd="box"
                    data-bg="#fff"
                    data-border="#000"
                    title="黒枠"
                ></button>

                <button
                    class="color-btn"
                    style="background:#ffe6e6;border-color:#f00;"
                    data-cmd="box"
                    data-bg="#ffe6e6"
                    data-border="#f00"
                    title="赤枠"
                ></button>

                <button
                    class="color-btn"
                    style="background:#e6f3ff;border-color:#0066cc;"
                    data-cmd="box"
                    data-bg="#e6f3ff"
                    data-border="#0066cc"
                    title="青枠"
                ></button>

                <button
                    class="color-btn"
                    style="background:#e6ffe6;border-color:#0a0;"
                    data-cmd="box"
                    data-bg="#e6ffe6"
                    data-border="#0a0"
                    title="緑枠"
                ></button>

                <button
                    class="color-btn"
                    style="background:#ffffe6;border-color:#cc9900;"
                    data-cmd="box"
                    data-bg="#ffffe6"
                    data-border="#cc9900"
                    title="黄枠"
                ></button>
            </div>


            <button
                class="edit-btn"
                id="btn-link"
                title="内部リンク"
            >
                リンク
            </button>

            <button
                class="edit-btn"
                id="btn-extlink"
                title="外部リンク"
            >
                外リンク
            </button>

            <button
                class="edit-btn"
                id="btn-img"
                title="画像(枠あり)"
            >
                画像
            </button>

            <button
                class="edit-btn"
                id="btn-img-inline"
                title="行内画像"
            >
                行内画像
            </button>

            <button
                class="edit-btn"
                id="btn-h2"
                title="大見出し"
            >
                H2
            </button>

            <button
                class="edit-btn"
                id="btn-h3"
                title="中見出し"
            >
                H3
            </button>

            <button
                class="edit-btn"
                id="btn-list"
                title="箇条書き"
            >
                リスト
            </button>

            <button
                class="edit-btn"
                id="btn-table"
                title="表作成"
            >
                表
            </button>

            <button
                class="edit-btn"
                id="btn-msgbox"
                title="警告枠"
            >
                枠
            </button>

            <button
                class="edit-btn"
                id="btn-toc"
                title="目次"
            >
                目次
            </button>

            <button
                class="edit-btn"
                id="btn-infobox"
                title="インフォボックス"
            >
                Info
            </button>

        </div>


        <textarea id="edit-textarea"></textarea>

        <button id="save-btn">
            変更を保存
        </button>
    `;


    const textarea =
        document.getElementById("edit-textarea");

    textarea.value = content;


    /* =====================================================
       テキスト挿入
    ===================================================== */

    function insertText(prefix, suffix) {

        const start =
            textarea.selectionStart;

        const end =
            textarea.selectionEnd;

        const selected =
            textarea.value.substring(start, end);


        textarea.setRangeText(
            prefix +
            selected +
            suffix,
            start,
            end,
            "select"
        );


        textarea.focus();
    }


    /* =====================================================
       ボタン
    ===================================================== */

    document.getElementById("btn-bold").onclick =
        () => insertText("'''", "'''");


    document.getElementById("btn-strike").onclick =
        () => insertText("<s>", "</s>");


    /* -----------------------------------------------------
       色
    ----------------------------------------------------- */

    document
        .querySelectorAll(".color-btn")
        .forEach(btn => {

            btn.onclick = () => {

                const cmd =
                    btn.getAttribute("data-cmd");


                if (cmd === "color") {

                    const val =
                        btn.getAttribute("data-val");

                    insertText(
                        `<span style="color: ${val};">`,
                        "</span>"
                    );
                }

                else if (cmd === "box") {

                    const bg =
                        btn.getAttribute("data-bg");

                    const border =
                        btn.getAttribute("data-border");

                    insertText(
                        `\n<div class="colored-box" style="background-color: ${bg}; border-color: ${border};">\n`,
                        "\n</div>\n"
                    );
                }
            };
        });


    /* -----------------------------------------------------
       内部リンク
    ----------------------------------------------------- */

    document.getElementById("btn-link").onclick =
        () => insertText("[[", "]]");


    /* -----------------------------------------------------
       外部リンク
    ----------------------------------------------------- */

    document.getElementById("btn-extlink").onclick =
        () => insertText("[", " ]");


    /* -----------------------------------------------------
       画像
       
       ここを今回きれいに修正。
       
       保存される記法：
       [[File:画像URL|thumb|250px|右|画像の説明文]]
    ----------------------------------------------------- */

    document.getElementById("btn-img").onclick =
        () => insertText(
            "[[File:",
            "|thumb|250px|右|画像の説明文]]"
        );


    /* -----------------------------------------------------
       行内画像
       
       保存される記法：
       [[File:画像URL|inline]]
    ----------------------------------------------------- */

    document.getElementById("btn-img-inline").onclick =
        () => insertText(
            "[[File:",
            "|inline]]"
        );


    /* -----------------------------------------------------
       H2
    ----------------------------------------------------- */

    document.getElementById("btn-h2").onclick =
        () => insertText(
            "\n== ",
            " ==\n"
        );


    /* -----------------------------------------------------
       H3
    ----------------------------------------------------- */

    document.getElementById("btn-h3").onclick =
        () => insertText(
            "\n=== ",
            " ===\n"
        );


    /* -----------------------------------------------------
       リスト
    ----------------------------------------------------- */

    document.getElementById("btn-list").onclick =
        () => insertText(
            "\n* ",
            ""
        );


    /* -----------------------------------------------------
       TOC
    ----------------------------------------------------- */

    document.getElementById("btn-toc").onclick =
        () => insertText(
            "__TOC__\n",
            ""
        );


    /* -----------------------------------------------------
       表
    ----------------------------------------------------- */

    document.getElementById("btn-table").onclick =
        () => {

            const tpl = `
{| class="wikitable"
! 見出し1 !! 見出し2
|-
| style="background: #e6e6fa;"| 色付きセル || データ2
|-
| データ3 || データ4
|}
`;

            insertText(tpl, "");
        };


    /* -----------------------------------------------------
       MessageBox
    ----------------------------------------------------- */

    document.getElementById("btn-msgbox").onclick =
        () => {

            const tpl = `
{{MessageBox
| border = red
| bg = #ffefef
| text = 警告メッセージ
}}
`;

            insertText(tpl, "");
        };


    /* -----------------------------------------------------
       Infobox
    ----------------------------------------------------- */

    document.getElementById("btn-infobox").onclick =
        () => {

            const tpl = `
{{Infobox
| width = 300px
| title = 
| subtitle = 
| image = 
| caption = 
| section_bg = #e6e6fa
| section_color = #222222
| section = 基本情報
| 項目名1 = 
| 項目名2 = 
}}
`;

            insertText(tpl, "");
        };


    /* =====================================================
       保存
    ===================================================== */

    document
        .getElementById("save-btn")
        .addEventListener("click", async () => {

            const saveBtn =
                document.getElementById("save-btn");

            saveBtn.textContent = "保存中...";
            saveBtn.disabled = true;


            try {

                const newText =
                    textarea.value;


                await setDoc(
                    doc(
                        db,
                        "articles",
                        currentArticle
                    ),
                    {
                        content: newText,
                        timestamp: new Date()
                    }
                );


                if (!allArticles.includes(currentArticle)) {
                    allArticles.push(currentArticle);
                }


                await loadArticle(currentArticle);
            }

            catch (error) {

                console.error(error);

                alert(
                    "保存に失敗しました: " +
                    error.message
                );


                saveBtn.textContent =
                    "変更を保存";

                saveBtn.disabled = false;
            }
        });
}


/* =========================================================
   検索結果
========================================================= */

function showSearchResults(query) {

    tabView.classList.remove("selected");
    tabEdit.classList.remove("selected");

    firstHeading.textContent =
        `「${query}」の検索結果`;


    const results =
        allArticles.filter(title =>
            title.includes(query)
        );


    if (results.length === 0) {

        bodyContent.innerHTML = `
            <p>
                「${escapeHtml(query)}」
                に一致するページは見つかりませんでした。
            </p>

            <p>
                <a
                    href="#"
                    class="internal-link"
                    data-target="${escapeAttribute(query)}"
                >
                    ${escapeHtml(query)}
                    を新規作成する
                </a>
            </p>
        `;
    }

    else {

        let html =
            '<ul class="search-results-list">';


        results.forEach(title => {

            html += `
                <li class="search-result-item">
                    <a
                        href="#"
                        class="internal-link"
                        data-target="${escapeAttribute(title)}"
                    >
                        ${escapeHtml(title)}
                    </a>
                </li>
            `;
        });


        html += "</ul>";

        bodyContent.innerHTML = html;
    }


    attachInternalLinks();

    searchSuggest.style.display = "none";
}


/* =========================================================
   検索候補
========================================================= */

searchInput.addEventListener(
    "input",
    () => {

        const val =
            searchInput.value.trim();


        if (!val) {

            searchSuggest.style.display =
                "none";

            return;
        }


        const matches =
            allArticles
                .filter(title =>
                    title.includes(val)
                )
                .slice(0, 5);


        if (matches.length > 0) {

            searchSuggest.innerHTML =
                matches
                    .map(title =>
                        `<li>${escapeHtml(title)}</li>`
                    )
                    .join("");


            searchSuggest.style.display =
                "block";


            searchSuggest
                .querySelectorAll("li")
                .forEach(li => {

                    li.addEventListener(
                        "click",
                        () => {

                            searchInput.value =
                                "";

                            searchSuggest.style.display =
                                "none";

                            loadArticle(
                                li.textContent
                            );
                        }
                    );
                });
        }

        else {

            searchSuggest.style.display =
                "none";
        }
    }
);


/* =========================================================
   検索候補を閉じる
========================================================= */

document.addEventListener(
    "click",
    e => {

        if (!searchForm.contains(e.target)) {

            searchSuggest.style.display =
                "none";
        }
    }
);


/* =========================================================
   検索
========================================================= */

searchForm.addEventListener(
    "submit",
    e => {

        e.preventDefault();


        const val =
            searchInput.value.trim();


        if (!val) {
            return;
        }


        const exactMatch =
            allArticles.find(
                title => title === val
            );


        if (
            exactMatch &&
            allArticles.filter(
                title => title.includes(val)
            ).length === 1
        ) {

            searchInput.value = "";

            searchSuggest.style.display =
                "none";

            loadArticle(exactMatch);
        }

        else {

            searchInput.value = "";

            showSearchResults(val);
        }
    }
);


/* =========================================================
   タブ
========================================================= */

tabView.addEventListener(
    "click",
    e => {

        e.preventDefault();

        loadArticle(currentArticle);
    }
);


tabEdit.addEventListener(
    "click",
    e => {

        e.preventDefault();

        openEditor();
    }
);


/* =========================================================
   メインページ
========================================================= */

document
    .getElementById("nav-main")
    .addEventListener(
        "click",
        e => {

            e.preventDefault();

            loadArticle("Hajipedia");
        }
    );


document
    .getElementById("logo-link")
    .addEventListener(
        "click",
        e => {

            e.preventDefault();

            loadArticle("Hajipedia");
        }
    );


/* =========================================================
   起動
========================================================= */

fetchAllArticles()
    .then(() => {
        loadArticle("Hajipedia");
    });

const markdownIt = require("markdown-it");
const markdownItFootnote = require("markdown-it-footnote");

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("style.css");

  // Поддержка пермалинков
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  let markdownLib = markdownIt({ html: true }).use(markdownItFootnote);
  eleventyConfig.setLibrary("md", markdownLib);

  // ФУНКЦИЯ ПРЕВРАЩЕНИЯ ВИКИ-ССЫЛКИ В HTML
  function resolveWikiLink(wikiContent, allPages) {
    const parts = wikiContent.split("|");
    const rawPath = parts[0].trim(); 
    const linkText = (parts[1] || parts[0]).trim(); 

    const targetFileName = rawPath.split("/").pop().replace(".md", "").toLowerCase().trim();
    const pagesSource = (allPages.length > 0) ? allPages : (global.eleventyCollectionsAll || []);

    const foundPage = pagesSource.find(page => {
      if (!page.inputPath) return false;
      const actualFileName = page.inputPath.split("/").pop().replace(".md", "").toLowerCase().trim();
      return actualFileName === targetFileName;
    });

    if (foundPage && foundPage.url) {
      return `<a href="/digital-garden${foundPage.url}">${linkText}</a>`;
    }
    return `<a href="#">${linkText}</a>`;
  }

  // УМНЫЙ ТРАНСФОРМЕР ССЫЛОК И СБОРКА МЕНЮ
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      const allPages = this.page.collection ? this.page.collection.all : [];

      // 1. Исправление вики-ссылок [[...]] в основном ТЕКСТЕ текущей статьи
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        return resolveWikiLink(p1, allPages);
      });

// 2. СБОРКА САЙДБАРА ИЗ СЛУЖЕБНОГО ФАЙЛА НАВИГАЦИИ
      const pathSegments = this.page.inputPath.split("/").filter(Boolean);
      const folderSegments = pathSegments.slice(0, -1);

      let configPage = null;
      let currentBookCollection = [];
      let currentFolder = folderSegments[folderSegments.length - 1] || "";

      // Поднимаемся от текущей подпапки к корню книги в поисках navigation.md
      for (let i = folderSegments.length; i > 0; i--) {
        const targetPathPart = "/" + folderSegments.slice(0, i).join("/") + "/";
        
        const matches = global.eleventyCollectionsAll ? 
          global.eleventyCollectionsAll.filter(p => p.inputPath && p.inputPath.includes(targetPathPart)) : [];

        const nav = matches.find(p => p.inputPath && p.inputPath.toLowerCase().includes("navigation.md"));

        if (nav) {
          configPage = nav;
          currentBookCollection = matches;
          currentFolder = folderSegments[i - 1];
          break;
        }
      }

      const indexPage = currentBookCollection.find(p => p.data && (p.data.type === "index" || p.data.type === "main"));

      let currentBookTitle = currentFolder ? currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1) : "Книга";
      if (indexPage && indexPage.data && indexPage.data.title) {
        currentBookTitle = indexPage.data.title;
      }

      let sidebarHtml = `<nav class="sidebar-nav">
        <div class="sidebar-back-link">
          <a href="/digital-garden/">← На главную</a>
        </div>
        <h3>${currentBookTitle}</h3>`;

      if (indexPage) {
        const isIndexActive = (indexPage.url === this.page.url) ? 'class="active-node"' : '';
        sidebarHtml += `<ul class="menu-section-main">
          <li ${isIndexActive}><a href="/digital-garden${indexPage.url}">📌 Главная страница книги</a></li>
        </ul><hr class="menu-divider">`;
      }

      let menuContentHtml = "";
      if (configPage) {
        const rawConfigContent = configPage.content || "";

        if (rawConfigContent) {
          const blocks = rawConfigContent.split(/<h3[^>]*>/i);

          for (let i = 1; i < blocks.length; i++) {
            const block = blocks[i];
            
            const closeH3Index = block.toLowerCase().indexOf("</h3>");
            if (closeH3Index === -1) continue;

            const sectionTitle = block.substring(0, closeH3Index).trim();

            const ulStartIndex = block.toLowerCase().indexOf("<ul");
            const ulEndIndex = block.toLowerCase().indexOf("</ul>");

            if (ulStartIndex !== -1 && ulEndIndex !== -1 && ulStartIndex < ulEndIndex) {
              let ulBlock = block.substring(ulStartIndex, ulEndIndex + 5);

              ulBlock = ulBlock.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
                return resolveWikiLink(p1, allPages);
              });

              const currentUrlChunk = this.page.url;
              if (currentUrlChunk) {
                const escapedUrl = currentUrlChunk.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const activeLiRegex = new RegExp(`(<li[^>]*>\\s*<a\\s+href="[^"]*${escapedUrl}"[^>]*>)`, "i");
                ulBlock = ulBlock.replace(activeLiRegex, '<li class="active-node">$1');
              }

              menuContentHtml += `<div class="sidebar-menu-section">`;
              menuContentHtml += `<span class="menu-section-title">${sectionTitle}</span>`;
              menuContentHtml += `${ulBlock}`;
              menuContentHtml += `</div><hr class="menu-divider">`;
            }
          }
        }
      }

      if (menuContentHtml) {
        sidebarHtml += menuContentHtml;
        sidebarHtml = sidebarHtml.replace(/<hr class="menu-divider"><\/nav>$/, "</nav>");
      } else {
        sidebarHtml += `<p style="padding: 10px; color: #e53e3e; font-size: 0.9rem;">⚠️ Файл navigation.md не найден в памяти сборщика или пуст.</p>`;
      }

      sidebarHtml += `</nav>`;

      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";
      const isMainPage = (this.page.url === "/" || this.page.url === "/index.html");
      const bodyClass = isMainPage ? "main-page-layout" : "";
      const renderSidebar = isMainPage ? "" : sidebarHtml;

      let mainTextContent = content;
      const scriptRegex = /(<script[\s\S]*?<\/script>)/gi;
      let matchScript;
      while ((matchScript = scriptRegex.exec(content)) !== null) {
        if (!matchScript[0].includes("sidebar-scroll")) {
          mainTextContent = mainTextContent.replace(matchScript[0], "");
        }
      }

      return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="/digital-garden/style.css">
    
    <style>
        /* ЧИСТЫЙ CSS ДЛЯ ВСПЛЫВАЮЩИХ СНОСОК ВНУТРИ ТЕКСТА */
        .footnote-ref {
            position: relative !important;
            display: inline-block !important;
        }

        .footnote-ref a {
            text-decoration: none !important;
            font-weight: bold !important;
            color: #3182ce !important;
            padding: 0 2px !important;
        }

        /* Окно сноски через CSS ::after */
        .footnote-ref[data-footnote]:hover::after {
            content: attr(data-footnote);
            position: absolute;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            background: #ffffff;
            color: #2d3748;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 0.82rem;
            font-weight: normal;
            line-height: 1.4;
            white-space: normal;
            width: max-content;
            max-width: 280px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            z-index: 9999;
            pointer-events: none;
        }

        @media (max-width: 768px) {
            .layout-wrapper {
                display: flex !important;
                flex-direction: column !important;
            }

            .sidebar-nav {
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                position: relative !important;
                padding: 15px !important;
                border-right: none !important;
                border-bottom: 2px solid #e2e8f0 !important;
                box-shadow: none !important;
            }

            .sidebar-nav ul {
                max-height: 200px !important;
                overflow-y: auto !important;
                padding-left: 10px !important;
            }

            .content-container {
                margin-left: 0 !important;
                width: 100% !important;
                padding: 15px !important;
            }

            .container {
                max-width: 100% !important;
                padding: 0 !important;
            }
        }
    </style>
</head>
<body class="${bodyClass}">
    <div class="layout-wrapper">
        ${renderSidebar}
        <main class="content-container">
            <div class="container">
                ${mainTextContent}
            </div>
        </main>
    </div>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            var sidebar = document.querySelector(".sidebar-nav");
            if (sidebar) {
                var scrollTop = sessionStorage.getItem("sidebar-scroll");
                if (scrollTop) { sidebar.scrollTop = parseInt(scrollTop, 10); }
                window.addEventListener("beforeunload", function() {
                    sessionStorage.setItem("sidebar-scroll", sidebar.scrollTop);
                });
            }

            // ПЕРЕНОС ТЕКСТА СНОСОК В АТРИБУТ DATA-FOOTNOTE
            var refs = document.querySelectorAll(".footnote-ref");
            refs.forEach(function(ref) {
                var link = ref.querySelector("a");
                if (!link) return;
                
                var href = link.getAttribute("href");
                if (!href) return;

                var fnId = href.replace("#", "");
                var targetFn = document.getElementById(fnId);
                
                if (targetFn) {
                    var clone = targetFn.cloneNode(true);
                    var backrefs = clone.querySelectorAll(".footnote-backref");
                    backrefs.forEach(function(b) { b.remove(); });
                    
                    var text = clone.textContent.trim();
                    ref.setAttribute("data-footnote", text);
                }
            });
        });
    </script>
</body>
</html>`;
    }
    return content;
  });

  eleventyConfig.addCollection("allPagesGlobal", function(collectionApi) {
    global.eleventyCollectionsAll = collectionApi.getAll();
    return global.eleventyCollectionsAll;
  });

  eleventyConfig.addGlobalData("eleventyComputed.permalink", () => {
    return (data) => {
      if (data.page.inputPath.endsWith("index.md")) return "index.html";
      return data.permalink;
    };
  });
  
  return {
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dir: { input: "src/site/notes", output: "_site" }
  };
};

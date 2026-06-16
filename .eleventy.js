const markdownIt = require("markdown-it");
const fs = require("fs");

module.exports = function(eleventyConfig) {
  // Копируем файл стилей в корень сайта
  eleventyConfig.addPassthroughCopy("style.css");

  // === ШАГ 1: АВТОМАТИЧЕСКАЯ СОРТИРОВАННАЯ КОЛЛЕКЦИЯ ДЛЯ МЕНЮ ===
  eleventyConfig.addCollection("confiteor", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/site/notes/confiteor/**/*.md")
      .sort((a, b) => {
        return a.fileSlug.localeCompare(b.fileSlug, 'ru', { numeric: true });
      });
  });

  // Стандартная поддержка пермалинков
  eleventyConfig.addGlobalData("permalink", (data) => {
    if (!data || !data.page) return undefined;
    return data.permalink || undefined; 
  });

  let markdownLib = markdownIt({ html: true });
  eleventyConfig.setLibrary("md", markdownLib);

  // УМНЫЙ ТРАНСФОРМЕР ССЫЛОК И ВЕРСТКИ
  eleventyConfig.addTransform("wrap-and-fix-links", function(content, outputPath) {
    if (outputPath && outputPath.endsWith(".html")) {
      
      // Находим все вики-ссылки [[...]] в тексте статьи
      content = content.replace(/\[\[([^\]]+)\]\]/g, (match, p1) => {
        const parts = p1.split("|");
        const rawPath = parts[0].trim(); 
        const linkText = (parts[1] || parts[0]).trim(); 

        const targetFileName = rawPath.split("/").pop().replace(".md", "").toLowerCase().trim();
        const allPages = this.page.collection ? this.page.collection.all : [];
        const pagesSource = (allPages.length > 0) ? allPages : (global.eleventyCollectionsAll || []);

        const foundPage = pagesSource.find(page => {
          if (!page.inputPath) return false;
          const actualFileName = page.inputPath.split("/").pop().replace(".md", "").toLowerCase().trim();
          return actualFileName === targetFileName;
        });

        if (foundPage && foundPage.url) {
          return `<a href="/digital-garden${foundPage.url}">${linkText}</a>`;
        }

        // РЕЗЕРВНЫЙ ВАРИАНТ
        let folder = rawPath.toLowerCase().includes("confiteor") ? "confiteor" : "sense";
        let cleanName = targetFileName.replace(/^(i|ii|iii|iv)\.\s*/i, "").replace(/_/g, "-");
        
        if (folder === "sense" && cleanName.includes(" и ")) {
          cleanName = cleanName.split(" и ")[0].trim();
        }
        
        let fallbackSlug = cleanName.replace(/\s+/g, "-");
        
        if (targetFileName === "обсуждение") fallbackSlug = "obsuzhdenie";
        if (targetFileName.startsWith("формулы адриана")) fallbackSlug = "formuly-adriana";

        if (folder === "confiteor") {
          const numMatch = targetFileName.match(/Подраздел\s+(\d+)/i);
          if (numMatch) {
            const num = numMatch[1].padStart(2, '0');
            fallbackSlug = (num === "34") ? `35-palimpsestus-podrazdel-34` : `${num}-${fallbackSlug}`;
          }
        }

        return `<a href="/digital-garden/${folder}/${fallbackSlug}/">${linkText}</a>`;
      });

      // === ШАГ 2: ДИНАМИЧЕСКИЙ ПАРСЕР САЙДБАРА ИЗ ФАЙЛА ОГЛАВЛЕНИЯ ===
      const currentFolder = this.page.inputPath.split("/").reverse()[1]; 

      // База всех страниц текущей книги
      const currentBookCollection = global.eleventyCollectionsAll ? 
        global.eleventyCollectionsAll.filter(p => p.inputPath && p.inputPath.includes(`/${currentFolder}/`)) : [];

      // Находим файл оглавления книги (у которого во frontmatter стоит type: index)
      const indexPage = currentBookCollection.find(p => {
        if (!p.data) return false;
        const pType = p.data.type || (p.data.data ? p.data.data.type : "");
        return String(pType).toLowerCase().trim() === "index";
      });

      let sidebarHtml = `<nav class="sidebar-nav">
        <div class="sidebar-back-link">
          <a href="/digital-garden/">← На главную</a>
        </div>`;

      let currentBookTitle = currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1);

      if (indexPage && indexPage.inputPath && fs.existsSync(indexPage.inputPath)) {
        if (indexPage.data && indexPage.data.title) {
          currentBookTitle = indexPage.data.title;
        }
        sidebarHtml += `<h3>${currentBookTitle}</h3>`;

        // Ссылка на само Оглавление всегда идет первым пунктом
        const isIndexActive = (indexPage.url === this.page.url) ? 'class="active-node"' : '';
        sidebarHtml += `<ul class="menu-section-main"><li ${isIndexActive}><a href="/digital-garden${indexPage.url}">Главная страница книги</a></li></ul><hr class="menu-divider">`;

        try {
          // Читаем разметку Оглавления напрямую с диска
          const indexContent = fs.readFileSync(indexPage.inputPath, "utf8");
          
          // Удаляем frontmatter, оставляем только тело текста
          const bodyContent = indexContent.replace(/^---[\s\S]+?---/i, "");

          // Разбиваем текст на блоки по заголовкам типа **Название блока**
          const sections = bodyContent.split(/(?=\*\*[^*]+\*\*)/g);

          sections.forEach(section => {
            // Вытаскиваем имя секции из звездочек
            const headerMatch = section.match(/\*\*([^*]+)\*\*/);
            if (!headerMatch) return;
            const sectionTitle = headerMatch[1].trim();

            // Собираем все строки со ссылками внутри текущего блока
            const linkLines = section.split("\n").filter(line => line.trim().startsWith("-"));
            
            if (linkLines.length > 0) {
              sidebarHtml += `<span class="menu-section-title">${sectionTitle}</span>`;
              sidebarHtml += `<ul class="menu-section-list">`;

              linkLines.forEach(line => {
                // Извлекаем то, что внутри [[...]]
                const wikiMatch = line.match(/\[\[([^\]]+)\]\]/);
                if (wikiMatch) {
                  const parts = wikiMatch[1].split("|");
                  const rawTarget = parts[0].trim();
                  const defaultLabel = parts[1] ? parts[1].trim() : rawTarget;

                  // Отрезаем путь, оставляя чистое имя md-файла
                  const targetFileName = rawTarget.split("/").pop().replace(".md", "").toLowerCase().trim();

                  // Ищем страницу в коллекции по имени файла
                  const foundPage = currentBookCollection.find(page => {
                    if (!page.inputPath) return false;
                    const actualName = page.inputPath.split("/").pop().replace(".md", "").toLowerCase().trim();
                    return actualName === targetFileName;
                  });

                  // Генерируем пункт меню
                  if (foundPage && foundPage.url) {
                    const isActive = (foundPage.url === this.page.url) ? 'class="active-node"' : '';
                    const displayTitle = foundPage.data && foundPage.data.title ? foundPage.data.title : defaultLabel;
                    sidebarHtml += `<li ${isActive}><a href="/digital-garden${foundPage.url}">${displayTitle}</a></li>`;
                  } else {
                    // Если страница еще не создана, выводим её просто текстом (или ссылкой-заглушкой)
                    sidebarHtml += `<li class="broken-link">${defaultLabel}</li>`;
                  }
                }
              });

              sidebarHtml += `</ul><hr class="menu-divider">`;
            }
          });
        } catch (err) {
          console.error("Ошибка парсинга файла навигации:", err);
        }
      } else {
        // Резервный пустой сайдбар, если файла index.md нет в папке
        sidebarHtml += `<h3>${currentBookTitle}</h3>`;
      }

      // Удаляем последний лишний разделитель внутри сайдбара перед закрытием тега
      sidebarHtml = sidebarHtml.replace(/<hr class="menu-divider"><\/nav>$/, "</nav>");
      sidebarHtml += `</nav>`;

      // Вычисляем глобальный тег title
      const pageTitle = this.page.fileSlug ? this.page.fileSlug.replace(/[-_]/g, ' ') : "Цифровой Сад";

      const isMainPage = (this.page.url === "/" || this.page.url === "/index.html");
      const bodyClass = isMainPage ? "main-page-layout" : "";
      const renderSidebar = isMainPage ? "" : sidebarHtml;

      // === ШАГ 3: ДВУХКОЛОНОЧНЫЙ HTML ШАБЛОН ===
      return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="/digital-garden/style.css">
</head>
<body class="${bodyClass}">
    <div class="layout-wrapper">
        ${renderSidebar}
        <main class="content-container">
            <div class="container">
                ${content}
            </div>
        </main>
    </div>

    <!-- СКРИПТ СОХРАНЕНИЯ ПОЗИЦИИ СКРОЛЛА МЕНЮ -->
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            var sidebar = document.querySelector(".sidebar-nav");
            if (!sidebar) return;

            var scrollTop = sessionStorage.getItem("sidebar-scroll");
            if (scrollTop) {
                sidebar.scrollTop = parseInt(scrollTop, 10);
            }

            window.addEventListener("beforeunload", function() {
                sessionStorage.setItem("sidebar-scroll", sidebar.scrollTop);
            });
        });
    </script>
</body>
</html>`;
    }
    return content;
  });

  // Сохраняем коллекцию в глобальную видимость на этапе сборки
  eleventyConfig.addCollection("allPagesGlobal", function(collectionApi) {
    global.eleventyCollectionsAll = collectionApi.getAll();
    return global.eleventyCollectionsAll;
  });

  // Гарантируем правильное имя для главной страницы
  eleventyConfig.addGlobalData("eleventyComputed.permalink", () => {
    return (data) => {
      if (data.page.inputPath.endsWith("index.md")) {
        return "index.html";
      }
      return data.permalink;
    };
  });
  
  return {
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    dir: {
      input: "src/site/notes",
      output: "_site"
    }
  };
};

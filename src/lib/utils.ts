import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Processes HTML content for iframe display to prevent anchor links from affecting parent page
 * @param html - The HTML content to process
 * @returns Processed HTML with proper base tag and link handling
 */
export function processHTMLForIframe(html: string): string {
  if (!html || !html.trim()) {
    return html;
  }

  let processedHTML = html.trim();

  // Check if HTML already has a proper document structure
  const hasDoctype = processedHTML.toLowerCase().includes('<!doctype');
  const hasHtmlTag = processedHTML.toLowerCase().includes('<html');
  const hasHeadTag = processedHTML.toLowerCase().includes('<head');

  if (hasDoctype && hasHtmlTag && hasHeadTag) {
    // Full HTML document - inject base tag into existing head
    const headMatch = processedHTML.match(/(<head[^>]*>)/i);
    if (headMatch) {
      const baseTag = '\n  <base href="about:blank" target="_self">\n  <script>\n    // Prevent anchor links from affecting parent page\n    document.addEventListener("DOMContentLoaded", function() {\n      const links = document.querySelectorAll(\'a[href^="#"]\');\n      links.forEach(link => {\n        link.addEventListener("click", function(e) {\n          e.preventDefault();\n          const target = document.querySelector(this.getAttribute("href"));\n          if (target) {\n            target.scrollIntoView({ behavior: "smooth" });\n          }\n        });\n      });\n    });\n  </script>';
      
      processedHTML = processedHTML.replace(
        headMatch[1],
        headMatch[1] + baseTag
      );
    }
  } else if (hasHtmlTag && hasHeadTag) {
    // HTML with head but no doctype - inject base tag into existing head
    const headMatch = processedHTML.match(/(<head[^>]*>)/i);
    if (headMatch) {
      const baseTag = '\n  <base href="about:blank" target="_self">\n  <script>\n    // Prevent anchor links from affecting parent page\n    document.addEventListener("DOMContentLoaded", function() {\n      const links = document.querySelectorAll(\'a[href^="#"]\');\n      links.forEach(link => {\n        link.addEventListener("click", function(e) {\n          e.preventDefault();\n          const target = document.querySelector(this.getAttribute("href"));\n          if (target) {\n            target.scrollIntoView({ behavior: "smooth" });\n          }\n        });\n      });\n    });\n  </script>';
      
      processedHTML = processedHTML.replace(
        headMatch[1],
        headMatch[1] + baseTag
      );
    }
  } else {
    // HTML fragment or incomplete document - wrap in proper structure
    processedHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="about:blank" target="_self">
  <script>
    // Prevent anchor links from affecting parent page
    document.addEventListener("DOMContentLoaded", function() {
      const links = document.querySelectorAll('a[href^="#"]');
      links.forEach(link => {
        link.addEventListener("click", function(e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute("href"));
          if (target) {
            target.scrollIntoView({ behavior: "smooth" });
          }
        });
      });
    });
  </script>
</head>
<body>
${processedHTML}
</body>
</html>`;
  }

  return processedHTML;
}

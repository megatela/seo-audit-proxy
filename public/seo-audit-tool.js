document.addEventListener('DOMContentLoaded', function() {
  const urlInput = document.getElementById('urlInput');
  const analyzeButton = document.getElementById('analyzeButton');
  const loadingDiv = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');
  const analysisList = document.getElementById('analysisList');
  const seoScoreDiv = document.getElementById('seoScore');
  const errorDiv = document.getElementById('error');

  analyzeButton.addEventListener('click', analyzeUrl);

  // Definición de los pesos para la puntuación de cada métrica
  const METRIC_WEIGHTS = {
    'Título de la Página': 20,
    'Meta Descripción': 15,
    'Etiqueta H1': 15,
    'Encabezados (H2, H3, H4)': 10,
    'Atributos Alt en Imágenes': 10,
    'Densidad de Palabras Clave (Ej: "SEO")': 5, // Importancia menor como métrica directa
    'Longitud del Contenido': 10,
    'Enlaces Internos': 5,
    'Enlaces Externos': 5,
    'URL Amigable': 5,
    'Uso de HTTPS': 5
  };

  function analyzeUrl() {
    const url = urlInput.value.trim();
    errorDiv.style.display = 'none';
    seoScoreDiv.textContent = '--'; // Reset score
    analysisList.innerHTML = ''; // Limpiar resultados anteriores
    resultsDiv.style.display = 'none';

    if (!url) {
      errorDiv.textContent = '❌ Por favor, introduce una URL válida.';
      errorDiv.style.display = 'block';
      return;
    }

    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(url)) {
      errorDiv.textContent = '❌ Formato de URL inválido. Asegúrate de incluir http:// o https://';
      errorDiv.style.display = 'block';
      return;
    }

    loadingDiv.style.display = 'block';

    // Usar un proxy CORS para evitar problemas de Same-Origin Policy
    // ADVERTENCIA: Depender de proxies públicos puede ser inestable y tener límites.
    // Para un uso serio, considera configurar tu propio proxy si tienes un servidor.
   const proxyUrl = `https://seo-audit-proxy-nfv2hj9h3-carmen-e-silva-hs-projects.vercel.app/api/proxy?url=${encodeURIComponent(url)}`;
    fetch(proxyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error de red o el servidor respondió con un estado ${response.status}. La URL podría no ser accesible.`);
        }
        return response.json();
      })
      .then(data => {
        if (!data || !data.contents) {
            throw new Error('No se pudo obtener el contenido de la URL. Posiblemente un problema con el proxy o la URL no existe.');
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');

        const report = generateReport(doc, url);
        displayReport(report);

        loadingDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
      })
      .catch(error => {
        console.error('Error al analizar la URL:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = `❌ Error al procesar la URL: ${error.message}. Asegúrate de que la URL es correcta y accesible públicamente.`;
        errorDiv.style.display = 'block';
      });
  }

  function generateReport(doc, url) {
    const report = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Helper para añadir al reporte y calcular la puntuación
    function addReportItem(item, value, status, suggestion, icon, scoreFactor = 0) {
        report.push({ item, value, status, suggestion, icon });
        const weight = METRIC_WEIGHTS[item] || 0;
        maxPossibleScore += weight; // Suma el peso para el máximo posible

        if (status === 'Ok') {
            totalScore += weight; // Si está OK, añade el peso completo
        } else if (status === 'Advertencia') {
            totalScore += weight * scoreFactor; // Añade una fracción del peso si es advertencia
        }
        // Si es 'Falla', no añade nada (0 puntos)
    }

    // 1. Título de la Página (<title>)
    const titleElement = doc.querySelector('title');
    const title = titleElement ? titleElement.textContent.trim() : 'No encontrado';
    const titleLength = title.length;
    addReportItem(
      'Título de la Página',
      title,
      title === 'No encontrado' ? 'Falla' : (titleLength >= 10 && titleLength <= 70 ? 'Ok' : 'Advertencia'),
      title === 'No encontrado' ? 'Añade un título descriptivo y único.' : (titleLength < 10 ? `El título es muy corto (${titleLength} caracteres). Debería tener entre 10 y 70 caracteres.` : (titleLength > 70 ? `El título es muy largo (${titleLength} caracteres). Debería tener entre 10 y 70 caracteres.` : 'El título tiene una longitud adecuada. Asegúrate de que contenga tu palabra clave principal.')),
      title === 'No encontrado' ? '❌' : (titleLength >= 10 && titleLength <= 70 ? '✅' : '⚠️'),
      0.5 // 50% de los puntos por advertencia
    );

    // 2. Meta Descripción (<meta name="description">)
    const metaDescriptionElement = doc.querySelector('meta[name="description"]');
    const metaDescription = metaDescriptionElement ? metaDescriptionElement.getAttribute('content').trim() : 'No encontrada';
    const metaDescriptionLength = metaDescription.length;
    addReportItem(
      'Meta Descripción',
      metaDescription,
      metaDescription === 'No encontrada' ? 'Falla' : (metaDescriptionLength >= 50 && metaDescriptionLength <= 160 ? 'Ok' : 'Advertencia'),
      metaDescription === 'No encontrada' ? 'Añade una meta descripción atractiva que incluya tu palabra clave principal.' : (metaDescriptionLength < 50 ? `La meta descripción es muy corta (${metaDescriptionLength} caracteres). Debería tener entre 50 y 160 caracteres.` : (metaDescriptionLength > 160 ? `La meta descripción es muy larga (${metaDescriptionLength} caracteres). Debería tener entre 50 y 160 caracteres.` : 'La meta descripción tiene una longitud adecuada. Asegúrate de que sea persuasiva y contenga tu palabra clave principal.')),
      metaDescription === 'No encontrada' ? '❌' : (metaDescriptionLength >= 50 && metaDescriptionLength <= 160 ? '✅' : '⚠️'),
      0.5 // 50% de los puntos por advertencia
    );

    // 3. Etiqueta H1
    const h1Elements = doc.querySelectorAll('h1');
    addReportItem(
      'Etiqueta H1',
      h1Elements.length > 0 ? h1Elements[0].textContent.trim() : 'No encontrada',
      h1Elements.length === 1 ? 'Ok' : 'Falla',
      h1Elements.length === 0 ? 'Cada página debe tener una única etiqueta H1, idealmente con la palabra clave principal.' : (h1Elements.length > 1 ? `Se encontraron ${h1Elements.length} etiquetas H1. Lo ideal es tener solo una por página.` : 'H1 encontrado. Asegúrate de que sea único y contenga tu palabra clave principal.'),
      h1Elements.length === 1 ? '✅' : '❌'
    );

    // 4. Encabezados (H2, H3, etc.)
    const h2Elements = doc.querySelectorAll('h2');
    const h3Elements = doc.querySelectorAll('h3');
    const h4Elements = doc.querySelectorAll('h4');
    addReportItem(
      'Encabezados (H2, H3, H4)',
      `H2s: ${h2Elements.length}, H3s: ${h3Elements.length}, H4s: ${h4Elements.length}`,
      (h2Elements.length > 0 || h3Elements.length > 0) ? 'Ok' : 'Advertencia',
      (h2Elements.length > 0 || h3Elements.length > 0) ? 'Usa H2, H3, etc., para estructurar el contenido y mejorar la legibilidad. Incluye palabras clave secundarias.' : 'Considera usar encabezados H2, H3 para estructurar mejor tu contenido.',
      (h2Elements.length > 0 || h3Elements.length > 0) ? '✅' : '⚠️',
      0.75 // 75% de los puntos por advertencia (es importante, pero no una falla crítica)
    );

    // 5. Atributos Alt en Imágenes
    const images = doc.querySelectorAll('img');
    let imagesWithoutAlt = 0;
    images.forEach(img => {
      if (!img.getAttribute('alt') || img.getAttribute('alt').trim() === '') {
        imagesWithoutAlt++;
      }
    });
    addReportItem(
      'Atributos Alt en Imágenes',
      `${images.length - imagesWithoutAlt} de ${images.length} imágenes tienen atributo alt.`,
      imagesWithoutAlt === 0 ? 'Ok' : (imagesWithoutAlt < images.length / 2 ? 'Advertencia' : 'Falla'), // Si más de la mitad fallan, es Falla
      imagesWithoutAlt === 0 ? 'Todas las imágenes tienen atributo alt. ¡Bien hecho!' : `Hay ${imagesWithoutAlt} imagen(es) sin atributo alt. Añade texto alt descriptivo para accesibilidad y SEO.`,
      imagesWithoutAlt === 0 ? '✅' : (imagesWithoutAlt < images.length / 2 ? '⚠️' : '❌'),
      0.5 // 50% de los puntos por advertencia
    );

    // 6. Densidad de Palabras Clave (Ejemplo: contando la palabra "blog" o "SEO")
    // Esta métrica es más una pista que un factor SEO directo hoy en día.
    const bodyText = doc.body ? doc.body.textContent.toLowerCase() : '';
    // Podrías añadir un input para que el usuario defina la palabra clave
    const targetKeyword = 'seo'; // CAMBIA ESTO: Podrías añadir un input para que el usuario defina la palabra clave principal
    const keywordCount = (bodyText.match(new RegExp(targetKeyword, 'g')) || []).length;
    const totalWords = bodyText.split(/\s+/).filter(word => word.length > 0).length;
    const keywordDensity = totalWords > 0 ? ((keywordCount / totalWords) * 100).toFixed(2) : 0;
    const isKeywordPresent = keywordCount > 0;
    addReportItem(
      `Densidad de Palabras Clave (Ej: "${targetKeyword}")`,
      `${keywordDensity}% (${keywordCount} ocurrencias)`,
      isKeywordPresent && keywordDensity >= 0.5 && keywordDensity <= 3 ? 'Ok' : 'Advertencia', // Rango de 0.5% a 3%
      isKeywordPresent && keywordDensity >= 0.5 && keywordDensity <= 3 ? `La palabra clave "${targetKeyword}" tiene una densidad adecuada. Asegúrate de un uso natural.` : (keywordCount === 0 ? `La palabra clave "${targetKeyword}" no se encontró en el contenido.` : (keywordDensity < 0.5 ? `La densidad de "${targetKeyword}" es baja. Considera añadirla de forma natural.` : `La densidad de "${targetKeyword}" (${keywordDensity}%) es alta. Evita el "keyword stuffing".`)),
      isKeywordPresent && keywordDensity >= 0.5 && keywordDensity <= 3 ? '✅' : '⚠️',
      0.5 // 50% de los puntos por advertencia
    );

    // 7. Longitud del Contenido
    const contentLength = bodyText.length;
    addReportItem(
      'Longitud del Contenido',
      `${contentLength} caracteres`,
      contentLength >= 1500 ? 'Ok' : (contentLength >= 500 ? 'Advertencia' : 'Falla'), // Idealmente >1500, al menos >500
      contentLength >= 1500 ? 'El contenido es extenso y potencialmente profundo. ¡Excelente!' : (contentLength >= 500 ? 'El contenido es de longitud moderada. Considera expandirlo para ofrecer más valor.' : 'El contenido es muy corto. Extiéndelo para aportar más valor y mejorar el SEO.'),
      contentLength >= 1500 ? '✅' : (contentLength >= 500 ? '⚠️' : '❌'),
      0.5 // 50% de los puntos por advertencia
    );

    // 8. Enlaces Internos y Externos
    const allLinks = doc.querySelectorAll('a');
    let internalLinks = 0;
    let externalLinks = 0;
    const currentDomain = new URL(url).hostname;

    allLinks.forEach(link => {
      try {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#')) { // Ignorar anclas internas
          const linkUrl = new URL(href, url); // Resuelve URLs relativas
          if (linkUrl.hostname === currentDomain) {
            internalLinks++;
          } else {
            externalLinks++;
          }
        }
      } catch (e) {
        // Ignorar enlaces con href mal formados
      }
    });

    addReportItem(
      'Enlaces Internos',
      `${internalLinks} enlaces`,
      internalLinks >= 5 ? 'Ok' : (internalLinks >= 1 ? 'Advertencia' : 'Falla'), // Mínimo 1, idealmente 5+
      internalLinks >= 5 ? 'Buen número de enlaces internos. Ayuda a la navegación y SEO.' : (internalLinks >= 1 ? 'Considera añadir más enlaces internos a páginas relevantes de tu blog para mejorar la estructura.' : 'No se encontraron enlaces internos. Esto perjudica la navegación y la distribución de autoridad.'),
      internalLinks >= 5 ? '✅' : (internalLinks >= 1 ? '⚠️' : '❌'),
      0.5 // 50% de los puntos por advertencia
    );

    addReportItem(
      'Enlaces Externos',
      `${externalLinks} enlaces`,
      externalLinks >= 1 ? 'Ok' : 'Advertencia',
      externalLinks >= 1 ? 'Se encontraron enlaces externos. Es bueno enlazar a fuentes de autoridad cuando sea relevante.' : 'Considera añadir enlaces externos a fuentes de autoridad para respaldar tu contenido y mejorar la credibilidad.',
      externalLinks >= 1 ? '✅' : '⚠️',
      0.75 // 75% de los puntos por advertencia (menos crítico que no tener internos)
    );

    // 9. URL Amigable (Solo comprueba la URL dada)
    const urlPath = new URL(url).pathname;
    const isCleanUrl = !/[%&\?=\s]/.test(urlPath) && urlPath.indexOf('_') === -1; // No caracteres especiales, espacios, ni guiones bajos
    addReportItem(
        'URL Amigable',
        url,
        isCleanUrl ? 'Ok' : 'Falla',
        isCleanUrl ? 'La URL parece limpia y amigable. Intenta incluir tu palabra clave principal.' : 'La URL contiene caracteres especiales, espacios o guiones bajos que la hacen menos amigable. Opta por URLs cortas, descriptivas y con guiones para separar palabras.',
        isCleanUrl ? '✅' : '❌'
    );

    // 10. Uso de HTTPS
    const usesHttps = url.startsWith('https://');
    addReportItem(
        'Uso de HTTPS',
        usesHttps ? 'Sí' : 'No',
        usesHttps ? 'Ok' : 'Falla',
        usesHttps ? 'Tu sitio usa HTTPS. ¡Excelente para seguridad y SEO!' : 'Tu sitio no usa HTTPS. Deberías implementar un certificado SSL. Es un factor de clasificación importante.',
        usesHttps ? '✅' : '❌'
    );

    // Calcular la puntuación final normalizada a 100
    let finalScore = 0;
    if (maxPossibleScore > 0) {
        finalScore = (totalScore / maxPossibleScore) * 100;
    }
    return { report, finalScore: Math.round(finalScore) }; // Redondeamos la puntuación
  }

  function displayReport(data) {
    const report = data.report;
    const finalScore = data.finalScore;

    seoScoreDiv.textContent = finalScore;
    seoScoreDiv.style.color = finalScore >= 80 ? '#28a745' : (finalScore >= 50 ? '#ffc107' : '#dc3545');

    report.forEach(item => {
      const listItem = document.createElement('li');
      listItem.style.marginBottom = '12px';
      listItem.style.padding = '10px 15px';
      listItem.style.borderRadius = '5px';
      listItem.style.backgroundColor = item.status === 'Falla' ? '#ffebeb' : (item.status === 'Advertencia' ? '#fff9e6' : '#eafaea');
      listItem.style.borderLeft = item.status === 'Falla' ? '6px solid #e74c3c' : (item.status === 'Advertencia' ? '6px solid #f39c12' : '6px solid #2ecc71');
      listItem.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

      listItem.innerHTML = `
        <strong style="font-size: 1.1em; display: block; margin-bottom: 5px;">${item.icon} ${item.item}:</strong>
        <span style="font-style: italic; color: #666;">Valor Detectado: ${item.value}</span><br>
        <span style="font-size: 0.95em; color: #333; display: block; margin-top: 5px;">Sugerencia: ${item.suggestion}</span>
      `;
      analysisList.appendChild(listItem);
    });
  }
});
// api/proxy.js
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Falta la URL" });
  }

  try {
    const response = await fetch(url);
    const data = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ contents: data });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la URL", details: error.message });
  }
}

import express from "express";
import { exec } from "child_process";
import { readFileSync, unlinkSync, mkdtempSync, writeFileSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.raw({ type: "application/pdf", limit: "10mb" }));

app.post("/render-pdf", (req, res) => {
  const tmpDir = mkdtempSync(join(tmpdir(), "ct226-"));
  const pdfPath = join(tmpDir, "input.pdf");
  const imgPrefix = join(tmpDir, "page");

  writeFileSync(pdfPath, req.body);

  exec(`pdftoppm -jpeg -r 300 -f 1 -l 1 "${pdfPath}" "${imgPrefix}"`, (err) => {
    if (err) {
      console.error("pdftoppm error:", err);
      res.status(500).json({ error: "Rendering failed" });
      return;
    }
    const imgPath = `${imgPrefix}-1.jpg`;
    try {
      const imgBuffer = readFileSync(imgPath);
      const base64 = imgBuffer.toString("base64");
      res.json({ image: `data:image/jpeg;base64,${base64}` });
    } catch (e) {
      res.status(500).json({ error: "Could not read rendered image" });
    } finally {
      try { unlinkSync(pdfPath); } catch (e) {}
      try { unlinkSync(imgPath); } catch (e) {}
      try { rmdirSync(tmpDir); } catch (e) {}
    }
  });
});

app.listen(3001, () => console.log("PDF renderer running on http://localhost:3001"));

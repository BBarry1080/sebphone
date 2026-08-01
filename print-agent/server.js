const express = require("express");
const cors = require("cors");
const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");

const app = express();
app.use(cors());
app.use(express.json());

const PRINTER_IP = process.env.PRINTER_IP || "192.168.1.87";
const PRINTER_PORT = process.env.PRINTER_PORT || 9100;
const AGENT_PORT = process.env.AGENT_PORT || 4000;

function money(n) {
  return `${Number(n).toFixed(2)}€`;
}

async function buildAndPrint(ticket) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${PRINTER_IP}:${PRINTER_PORT}`,
    removeSpecialCharacters: false,
    lineCharacter: "-",
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error(`Imprimante injoignable sur ${PRINTER_IP}:${PRINTER_PORT}`);
  }

  printer.alignCenter();
  printer.bold(true);
  printer.println(ticket.companyName || "SLT GROUP (SRL)");
  printer.bold(false);
  printer.println(`TVA: ${ticket.tva || "BE 1028.764.677"}`);
  printer.println(`Caisse n°: ${ticket.caisseNom || ""}`);
  printer.println(`Date: ${ticket.dateTime}`);
  printer.println(`Ticket n°: ${String(ticket.ticketNumber).padStart(7, "0")}`);
  printer.drawLine();

  printer.alignLeft();
  let total = 0;
  for (const item of ticket.items) {
    total += item.total;
    printer.tableCustom([
      { text: `${item.name} x${item.qty}`, align: "LEFT", width: 0.7 },
      { text: money(item.total), align: "RIGHT", width: 0.3 },
    ]);
  }
  printer.drawLine();

  printer.bold(true);
  printer.tableCustom([
    { text: "TOTAL:", align: "LEFT", width: 0.7 },
    { text: money(total), align: "RIGHT", width: 0.3 },
  ]);
  printer.bold(false);
  printer.drawLine();

  const rate = ticket.tvaRate || 21;
  const base = total / (1 + rate / 100);
  printer.println("TVA:");
  printer.tableCustom([
    { text: `A ${rate}%:`, align: "LEFT", width: 0.34 },
    { text: money(base), align: "CENTER", width: 0.33 },
    { text: money(total), align: "RIGHT", width: 0.33 },
  ]);
  printer.drawLine();

  if (ticket.reglements && ticket.reglements.length) {
    for (const r of ticket.reglements) {
      printer.tableCustom([
        { text: `Reglement: ${r.mode}`, align: "LEFT", width: 0.7 },
        { text: money(r.montant), align: "RIGHT", width: 0.3 },
      ]);
    }
  } else if (ticket.reglement) {
    printer.tableCustom([
      { text: `Reglement: ${ticket.reglement.mode}`, align: "LEFT", width: 0.7 },
      { text: money(ticket.reglement.montant), align: "RIGHT", width: 0.3 },
    ]);
  }
  printer.drawLine();

  printer.alignCenter();
  printer.println("Merci de votre visite");
  printer.cut();

  await printer.execute();
}

app.post("/print", async (req, res) => {
  try {
    await buildAndPrint(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur impression:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/health", async (req, res) => {
  try {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `tcp://${PRINTER_IP}:${PRINTER_PORT}`,
    });
    const connected = await printer.isPrinterConnected();
    res.json({ ok: true, printerIp: `${PRINTER_IP}:${PRINTER_PORT}`, printerConnected: connected });
  } catch (err) {
    res.json({ ok: true, printerIp: `${PRINTER_IP}:${PRINTER_PORT}`, printerConnected: false, error: err.message });
  }
});

app.listen(AGENT_PORT, () => {
  console.log(`Agent d'impression SebPhone actif sur http://localhost:${AGENT_PORT}`);
  console.log(`Cible imprimante: ${PRINTER_IP}:${PRINTER_PORT}`);
});

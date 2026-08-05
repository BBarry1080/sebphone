const express = require("express");
const cors = require("cors");
const { ThermalPrinter, PrinterTypes, CharacterSet } = require("node-thermal-printer");

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
    width: 48,
    characterSet: CharacterSet.PC858_EURO,
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error(`Imprimante injoignable sur ${PRINTER_IP}:${PRINTER_PORT}`);
  }

  printer.setTypeFontA();
  printer.bold(true);
  printer.setTextDoubleHeight();

  printer.alignCenter();
  printer.println(ticket.companyName || "SLT GROUP (SRL)");
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

  printer.tableCustom([
    { text: "TOTAL:", align: "LEFT", width: 0.7 },
    { text: money(total), align: "RIGHT", width: 0.3 },
  ]);
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

  if (ticket.barcode) {
    printer.setTextNormal();
    printer.alignCenter();
    printer.printBarcode(String(ticket.barcode), 73, {
      hriPos: 2,
      hriFont: 0,
      width: 2,
      height: 80,
    });
    printer.newLine();
    printer.setTextDoubleHeight();
    printer.bold(true);
  }

  printer.alignCenter();
  printer.println("Merci de votre visite");
  printer.cut();

  await printer.execute();
}

async function buildAndPrintClosure(data) {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${PRINTER_IP}:${PRINTER_PORT}`,
    removeSpecialCharacters: false,
    lineCharacter: "*",
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error(`Imprimante injoignable sur ${PRINTER_IP}:${PRINTER_PORT}`);
  }

  printer.alignCenter();
  printer.bold(true);
  printer.println(`Z FINANCIER #${data.reportNumber}`);
  printer.println(data.companyName || "SLT GROUP");
  printer.bold(false);
  printer.println(data.tva || "BE1028.764.677");
  printer.println(`Caisse : ${data.caisse}`);
  printer.println(`Date : ${data.dateTime}`);
  printer.drawLine();

  printer.alignLeft();
  printer.println("Periode :");
  printer.println(`${data.periodStart} > ${data.periodEnd}`);
  printer.drawLine("*");
  printer.alignCenter();
  printer.println("< TICKETS DE CAISSE >");
  printer.alignLeft();
  printer.drawLine("*");

  printer.tableCustom([
    { text: "< VENTES >", align: "LEFT", width: 0.5 },
    { text: money(data.ventes.montant), align: "RIGHT", width: 0.25 },
    { text: `${data.ventes.count} #`, align: "RIGHT", width: 0.25 },
  ]);
  printer.tableCustom([
    { text: "< RETOURS >", align: "LEFT", width: 0.5 },
    { text: money(data.retours.montant), align: "RIGHT", width: 0.25 },
    { text: `${data.retours.count} #`, align: "RIGHT", width: 0.25 },
  ]);
  printer.drawLine();
  const caTickets = data.ventes.montant - data.retours.montant;
  const caCount = data.ventes.count - data.retours.count;
  printer.tableCustom([
    { text: "< CA TICKETS >", align: "LEFT", width: 0.5 },
    { text: money(caTickets), align: "RIGHT", width: 0.25 },
    { text: `${caCount} #`, align: "RIGHT", width: 0.25 },
  ]);
  printer.println(`Ticket moyen ${money(caCount > 0 ? caTickets / caCount : 0)}`);
  printer.drawLine();

  for (const r of data.tvaRows || []) {
    printer.tableCustom([
      { text: `(${r.code})${r.rate}%`, align: "LEFT", width: 0.25 },
      { text: money(r.base), align: "RIGHT", width: 0.25 },
      { text: money(r.tva), align: "RIGHT", width: 0.25 },
      { text: money(r.total), align: "RIGHT", width: 0.25 },
    ]);
  }
  printer.drawLine();

  printer.println("Reglements TICKETS");
  for (const r of data.reglements || []) {
    printer.tableCustom([
      { text: r.method, align: "LEFT", width: 0.6 },
      { text: money(r.montant), align: "RIGHT", width: 0.4 },
    ]);
  }
  printer.drawLine("*");
  printer.alignCenter();
  printer.println("< VENTES PAR CATEGORIES >");
  printer.alignLeft();
  printer.drawLine("*");

  for (const c of data.categories || []) {
    printer.tableCustom([
      { text: c.name, align: "LEFT", width: 0.5 },
      { text: money(c.montant), align: "RIGHT", width: 0.25 },
      { text: `${c.count} #`, align: "RIGHT", width: 0.25 },
    ]);
  }
  printer.drawLine("*");
  printer.alignCenter();
  printer.println("< DEPOTS / RETRAITS CAISSE >");
  printer.alignLeft();
  printer.drawLine("*");

  for (const r of data.retraits || []) {
    printer.println("->RETRAIT CAISSE");
    printer.println(` ${r.note}`);
    printer.println(` Montant :-${money(r.montant)} ${r.method}`);
  }

  printer.drawLine("*");
  printer.tableCustom([
    { text: "CA TOTAL :", align: "LEFT", width: 0.6 },
    { text: money(data.caTotal), align: "RIGHT", width: 0.4 },
  ]);
  printer.tableCustom([
    { text: "TOTAL CASH EN CAISSE :", align: "LEFT", width: 0.6 },
    { text: money(data.totalCashEnCaisse), align: "RIGHT", width: 0.4 },
  ]);
  printer.tableCustom([
    { text: "TOTAL Compte :", align: "LEFT", width: 0.6 },
    { text: String(data.totalCompte), align: "RIGHT", width: 0.4 },
  ]);
  printer.drawLine("*");

  printer.println(`PRELEVEMENT EN CLOTURE : ${money(-data.totalCompte)}`);
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

app.post("/print-closure", async (req, res) => {
  try {
    await buildAndPrintClosure(req.body);
    res.json({ ok: true });
  } catch (err) {
    console.error("Erreur impression clôture:", err.message);
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

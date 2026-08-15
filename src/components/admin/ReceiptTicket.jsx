import React, { useEffect, useState } from "react";
import { MAGASINS } from "../../utils/magasins";

const STORE = {
  name: "SLT GROUP",
  tel: "0492/40.54.57",
  tva: "BE1028.764.677",
  terminalCode: "GK6YPW0P JMMT",
};

function money(n) {
  return n.toFixed(2).replace(".", ",");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function tvaBreakdown(totalTTC, rate) {
  const ht = totalTTC / (1 + rate / 100);
  const tva = totalTTC - ht;
  return { ht, tva, ttc: totalTTC };
}

async function generateSignature({ ticketNumber, dateTime, items, total }) {
  const payload = [
    ticketNumber,
    dateTime.toISOString(),
    ...items.map((i) => `${i.qte}|${i.name}|${i.tot.toFixed(2)}`),
    total.toFixed(2),
  ].join("#");
  const data = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function Barcode({ seed }) {
  const bars = [];
  let x = (seed || 1) * 7919;
  for (let i = 0; i < 40; i++) {
    x = (x * 9301 + 49297) % 233280;
    bars.push((x / 233280) * 2 + 1);
  }
  return (
    <div className="flex justify-center items-end" style={{ height: "32px", margin: "8px 0 4px" }}>
      {bars.map((w, i) => (
        <div key={i} style={{ width: `${w}px`, height: "100%", background: "black", marginRight: "1px" }} />
      ))}
    </div>
  );
}

export default function ReceiptTicket({
  ticketNumber = 13,
  vendeur = "Admin",
  dateTime = new Date(),
  items = [],
  payments = [],
  changeAmount = 0,
  tvaRate = 21,
  paperWidth = "80mm",
  onPrint,
  repairInfo = null,
  repairInfoList = null,
  extraLines = null,
  totalOverride = null,
  magasin = null,
}) {
  const adresseComplete = MAGASINS[magasin]?.adresse || MAGASINS.louise.adresse
  const [adresseLigne1, adresseLigne2] = adresseComplete.split(', ')
  const [signature, setSignature] = useState("");
  const computedTotal = items.reduce((s, i) => s + i.tot, 0);
  const total = totalOverride != null ? Number(totalOverride) : computedTotal;
  const totalQte = items.reduce((s, i) => s + i.qte, 0);
  const tva = tvaBreakdown(total, tvaRate);

  useEffect(() => {
    generateSignature({ ticketNumber, dateTime, items, total }).then(setSignature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketNumber, dateTime.getTime(), total]);

  const boxWidth = paperWidth === "58mm" ? "220px" : "300px";
  const paymentLabels = { cash: "CASH", bancontact: "BANCONTACT", virement: "VIREMENT" };

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print { position: absolute; top: 0; left: 0; }
          #print-btn { display: none !important; }
          @page { size: ${paperWidth} auto; margin: 0; }
        }
      `}</style>

      {onPrint && (
        <button
          id="print-btn"
          onClick={onPrint}
          className="block mx-auto mb-4 bg-black text-white px-4 py-2 rounded font-bold"
        >
          Imprimer le ticket
        </button>
      )}

      <div
        id="receipt-print"
        style={{
          width: boxWidth,
          margin: "0 auto",
          background: "white",
          color: "black",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "10.5px",
          lineHeight: "1.4",
          padding: "10px",
        }}
      >
        <div className="text-center font-bold" style={{ fontSize: "14px" }}>{STORE.name}</div>
        <div className="text-center">{adresseLigne1}</div>
        <div className="text-center">{adresseLigne2}</div>
        <div className="text-center">Tel : {STORE.tel}</div>
        <div className="text-center">N&deg; TVA : {STORE.tva}</div>

        <div className="text-center font-bold" style={{ margin: "8px 0" }}>
          TICKET N&deg; {ticketNumber}
        </div>

        <div className="flex justify-between">
          <span>Vendeur: {vendeur}</span>
        </div>
        <div className="flex justify-between">
          <span>{formatDate(dateTime)}</span>
          <span>{formatTime(dateTime)}</span>
        </div>

        {repairInfoList && repairInfoList.length > 0 ? (
          repairInfoList.map((r, idx) => (
            <div key={idx} style={{ borderTop: "1px solid black", borderBottom: "1px solid black", padding: "4px 0", marginTop: "4px" }}>
              <div style={{ fontWeight: "bold", textAlign: "center" }}>BON RÉPARATION {r.bonNumber}</div>
              {r.clientNom && <div>Client : {r.clientNom}</div>}
              {r.appareil && <div>Appareil : {r.appareil}</div>}
              {r.imei && <div>IMEI : {r.imei}</div>}
              {r.typePanne && <div>Panne : {r.typePanne}</div>}
              {r.statut && <div>Statut : {r.statut}</div>}
            </div>
          ))
        ) : repairInfo && (
          <div style={{ borderTop: "1px solid black", borderBottom: "1px solid black", padding: "4px 0", marginTop: "4px" }}>
            <div style={{ fontWeight: "bold", textAlign: "center" }}>BON RÉPARATION {repairInfo.bonNumber}</div>
            {repairInfo.clientNom && <div>Client : {repairInfo.clientNom}</div>}
            {repairInfo.appareil && <div>Appareil : {repairInfo.appareil}</div>}
            {repairInfo.imei && <div>IMEI : {repairInfo.imei}</div>}
            {repairInfo.typePanne && <div>Panne : {repairInfo.typePanne}</div>}
            {repairInfo.statut && <div>Statut : {repairInfo.statut}</div>}
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "12%" }} />
            <col />
            <col style={{ width: "30%" }} />
          </colgroup>
          <thead>
            <tr style={{ borderTop: "1px solid black", borderBottom: "1px solid black" }}>
              <th className="text-left" style={{ padding: "2px 0" }}>QTE</th>
              <th className="text-left" style={{ padding: "2px 0" }}>ARTICLE</th>
              <th className="text-right" style={{ padding: "2px 0" }}>TOT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid black" }}>
                <td style={{ padding: "2px 0", verticalAlign: "top" }}>{it.qte}</td>
                <td style={{ padding: "2px 4px", wordBreak: "break-word" }}>{it.name}</td>
                <td className="text-right" style={{ padding: "2px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>{money(it.tot)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between font-bold" style={{ marginTop: "4px" }}>
          <span>{totalQte}&nbsp;&nbsp;&nbsp;TOTAL :</span>
          <span>{money(total)} &euro;</span>
        </div>

        <div style={{ marginTop: "6px" }}>
          {payments.map((p, idx) => (
            <div className="flex justify-between" key={idx}>
              <span>{paymentLabels[p.type] || p.type.toUpperCase()}</span>
              <span>{money(p.amount)} &euro;</span>
            </div>
          ))}
          {changeAmount > 0 && (
            <div className="flex justify-between">
              <span>RENDU :</span>
              <span>-{money(changeAmount)} &euro;</span>
            </div>
          )}
        </div>

        {extraLines && extraLines.length > 0 && (
          <div style={{ marginTop: "6px" }}>
            {extraLines.map((l, idx) => (
              <div className="flex justify-between" key={idx}>
                <span>{l.label}</span>
                <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>{l.value}</span>
              </div>
            ))}
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "6px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "26%" }} />
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th className="text-right font-bold" style={{ whiteSpace: "nowrap" }}>HT</th>
              <th className="text-right font-bold" style={{ whiteSpace: "nowrap" }}>TVA</th>
              <th className="text-right font-bold" style={{ whiteSpace: "nowrap" }}>TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid black" }}>
              <td>{tvaRate}%(A)</td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(tva.ht)}</td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(tva.tva)}</td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(tva.ttc)}</td>
            </tr>
            <tr>
              <td></td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(tva.ht)}</td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(tva.tva)}</td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(tva.ttc)}</td>
            </tr>
          </tbody>
        </table>

        <Barcode seed={ticketNumber} />

        <div className="text-center">{STORE.terminalCode}</div>
        <div style={{ fontSize: "9px", wordBreak: "break-all", marginTop: "4px" }}>
          Sign : {signature}
        </div>
      </div>
    </div>
  );
}

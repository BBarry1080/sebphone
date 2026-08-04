import React from "react";

const STORE = {
  name: "SLT GROUP",
  tva: "BE1028.764.677",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateZ(d) {
  return `${d.getDate()}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatDateTime(d) {
  return `${formatDateZ(d)} ${formatTime(d)}`;
}

function money(n) {
  return n.toFixed(2).replace(".", ",");
}

function Sep({ char = "*" }) {
  return (
    <div style={{
      overflow: "hidden",
      whiteSpace: "nowrap",
      height: "1em",
      letterSpacing: "1px",
    }}>
      {char.repeat(80)}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <>
      <Sep />
      <div className="text-center">&lt; {title} &gt;</div>
      <Sep />
    </>
  );
}

function Dashes() {
  return <Sep char="-" />;
}

function Row3({ label, montant, count }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span style={{ display: "flex", gap: "16px", whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>
        {montant !== undefined && <span>{typeof montant === "number" ? money(montant) : montant}</span>}
        {count !== undefined && <span>{count} #</span>}
      </span>
    </div>
  );
}

export default function ZFinancierReport({
  reportNumber = 3,
  caisse = 1,
  dateTime = new Date(),
  periodStart = new Date(),
  periodEnd = new Date(),
  ventes = { montant: 0, count: 0 },
  retours = { montant: 0, count: 0 },
  tvaRows = [],
  reglements = [],
  ventesFacturees = { factures: 0, notesCredit: 0 },
  remisesSurVentes = { montant: 0, count: 0 },
  categories = [],
  proformats = { bonsLivraison: 0, commandesClient: 0 },
  retraits = [],
  totalCashEnCaisse = 0,
  totalCompte = 0,
  paperWidth = "80mm",
  onPrint,
}) {
  const boxWidth = paperWidth === "58mm" ? "220px" : "300px";

  const caTickets = ventes.montant - retours.montant;
  const caCount = ventes.count - retours.count;
  const ticketMoyen = caCount > 0 ? caTickets / caCount : 0;

  const sumBase = tvaRows.reduce((s, r) => s + r.base, 0);
  const sumTva = tvaRows.reduce((s, r) => s + r.tva, 0);
  const sumTotal = tvaRows.reduce((s, r) => s + r.total, 0);

  const prelevementCloture = -totalCompte;

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #zreport-print, #zreport-print * { visibility: visible; }
          #zreport-print { position: absolute; top: 0; left: 0; }
          #print-btn-z { display: none !important; }
          @page { size: ${paperWidth} auto; margin: 0; }
        }
      `}</style>

      {onPrint && (
        <button
          id="print-btn-z"
          onClick={onPrint}
          className="block mx-auto mb-4 bg-black text-white px-4 py-2 rounded font-bold"
        >
          Imprimer le Z financier
        </button>
      )}

      <div
        id="zreport-print"
        style={{
          width: boxWidth,
          margin: "0 auto",
          background: "white",
          color: "black",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "10.5px",
          lineHeight: "1.5",
          padding: "10px",
        }}
      >
        <div className="text-center font-bold" style={{ fontSize: "14px" }}>
          Z FINANCIER #{reportNumber}
        </div>
        <div className="text-center font-bold">{STORE.name}</div>
        <div className="text-center">{STORE.tva}</div>
        <div className="text-center" style={{ marginTop: "6px" }}>Caisse : {caisse}</div>
        <div className="text-center">Date : {formatDateTime(dateTime)}</div>

        <div style={{ borderTop: "1px solid black", margin: "10px 0" }} />

        <div>Période :</div>
        <div>
          {formatDateTime(periodStart)} &gt; {formatDateTime(periodEnd)}
        </div>

        <SectionHeader title="TICKETS DE CAISSE" />
        <div style={{ marginTop: "4px" }}>
          <Row3 label="< VENTES >" montant={ventes.montant} count={ventes.count} />
          <Row3 label="< RETOURS >" montant={retours.montant} count={retours.count} />
          <Dashes />
          <Row3 label="< CA TICKETS >" montant={caTickets} count={caCount} />
          <Row3 label="Ticket moyen" montant={ticketMoyen} />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "27%" }} />
            <col style={{ width: "27%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th className="text-right" style={{ whiteSpace: "nowrap" }}>BASE</th>
              <th className="text-right" style={{ whiteSpace: "nowrap" }}>TVA</th>
              <th className="text-right" style={{ whiteSpace: "nowrap" }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {tvaRows.map((r, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap" }}>({r.code}){r.rate}%</td>
                <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(r.base)}</td>
                <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(r.tva)}</td>
                <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Dashes />
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "27%" }} />
            <col style={{ width: "27%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <tbody>
            <tr>
              <td></td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(sumBase)}</td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(sumTva)}</td>
              <td className="text-right" style={{ whiteSpace: "nowrap" }}>{money(sumTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: "8px" }}>Règlements TICKETS</div>
        <div style={{ marginTop: "4px" }}>
          {reglements.map((r, i) => (
            <div className="flex justify-between" key={i}>
              <span>{r.method}</span>
              <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>{money(r.montant)}</span>
            </div>
          ))}
        </div>

        <SectionHeader title="VENTES FACTUREES" />
        <Row3 label="< FACTURES >" count={ventesFacturees.factures} />
        <Row3 label="< NOTES DE CREDIT >" count={ventesFacturees.notesCredit} />

        <SectionHeader title="REMISES SUR VENTES" />
        <div style={{ marginTop: "4px" }}>
          <Row3 label="" montant={remisesSurVentes.montant} count={remisesSurVentes.count} />
        </div>

        <SectionHeader title="VENTES PAR CATEGORIES" />
        <div style={{ marginTop: "4px" }}>
          {categories.map((c, i) => (
            <Row3 key={i} label={c.name} montant={c.montant} count={c.count} />
          ))}
        </div>

        <SectionHeader title="PROFORMATS" />
        <Row3 label="< BONS DE LIVRAISON >" count={proformats.bonsLivraison} />
        <Row3 label="< COMMANDES CLIENT >" count={proformats.commandesClient} />

        <SectionHeader title="DEPOTS / RETRAITS CAISSE" />
        <div style={{ marginTop: "4px" }}>
          {retraits.map((r, i) => (
            <div key={i} style={{ marginBottom: "4px" }}>
              <div>-&gt;RETRAIT CAISSE</div>
              <div style={{ paddingLeft: "4px" }}>{r.note}</div>
              <div style={{ paddingLeft: "4px" }}>
                Montant :-{money(r.montant)} {r.method}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "4px" }}><Sep /></div>
        <div style={{ marginTop: "4px" }}>
          <div className="flex justify-between">
            <span>CA TOTAL :</span>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>{money(sumTotal)} &euro;</span>
          </div>
          <div className="flex justify-between">
            <span>TOTAL CASH EN CAISSE :</span>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>{money(totalCashEnCaisse)} &euro;</span>
          </div>
          <div className="flex justify-between">
            <span>TOTAL Compt&eacute; :</span>
            <span style={{ whiteSpace: "nowrap", flexShrink: 0, marginLeft: "8px" }}>{totalCompte}</span>
          </div>
        </div>
        <div style={{ marginTop: "4px" }}><Sep /></div>

        <div style={{ marginTop: "8px" }}>
          PRELEVEMENT EN CLOTURE : {money(prelevementCloture)}
        </div>
      </div>
    </div>
  );
}

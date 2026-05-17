import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

export default function Etiquette({ phone, onClose }) {
  const barcodeRef = useRef(null)

  useEffect(() => {
    if (barcodeRef.current && phone.imei) {
      JsBarcode(barcodeRef.current, phone.imei, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0,
      })
    }
  }, [phone.imei])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=300')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            width: 6cm;
            height: 4cm;
            padding: 4px 6px;
            background: white;
          }
          @page {
            size: 6cm 4cm;
            margin: 0;
          }
          @media print {
            body { margin: 0; }
          }
          .label {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .company {
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 1.5px;
            color: #000;
            text-transform: uppercase;
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }
          .model {
            font-size: 8px;
            font-weight: 700;
            color: #000;
            text-align: center;
            margin-top: 2px;
            text-transform: uppercase;
          }
          .price {
            font-size: 22px;
            font-weight: 900;
            color: #000;
            text-align: center;
            line-height: 1;
            margin: 2px 0;
          }
          .imei {
            font-size: 7px;
            color: #333;
            text-align: center;
            letter-spacing: 0.5px;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            margin-top: 2px;
          }
          .barcode-container svg {
            width: 100%;
            max-width: 5.5cm;
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="label">
          <div class="company">SLT GROUP</div>
          <div class="model">
            ${phone.name || phone.model}
            ${phone.storage ? '· ' + phone.storage : ''}
            ${phone.battery_health ? '· ' + phone.battery_health + '%' : ''}
          </div>
          <div class="price">${phone.price ? phone.price.toLocaleString('fr-BE') + ',00€' : '—'}</div>
          <div class="imei">${phone.imei || 'IMEI non renseigné'}</div>
          ${phone.imei ? `
          <div class="barcode-container">
            <svg id="barcode"></svg>
          </div>
          <script>
            JsBarcode("#barcode", "${phone.imei}", {
              format: "CODE128",
              width: 1.5,
              height: 35,
              displayValue: false,
              margin: 0
            });
          </script>
          ` : ''}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  // Prix formaté
  const prixFormate = phone.price
    ? phone.price.toLocaleString('fr-BE') + ',00€'
    : '—'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl p-6 w-80"
          onClick={e => e.stopPropagation()}>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#1B2A4A]">🏷️ Aperçu étiquette</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {/* APERÇU */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 mb-4 bg-gray-50">
            <div style={{
              width: '100%',
              fontFamily: 'Arial, sans-serif',
              background: 'white',
              padding: '8px 10px',
              borderRadius: '4px',
            }}>
              {/* Société */}
              <p style={{
                fontSize: '10px', fontWeight: '900',
                letterSpacing: '2px', textAlign: 'center',
                borderBottom: '1px solid black', paddingBottom: '3px',
                marginBottom: '3px'
              }}>
                SLT GROUP
              </p>

              {/* Modèle */}
              <p style={{
                fontSize: '9px', fontWeight: '700',
                textAlign: 'center', textTransform: 'uppercase',
                marginBottom: '2px'
              }}>
                {phone.name || phone.model}
                {phone.storage ? ' · ' + phone.storage : ''}
                {phone.battery_health ? ' · ' + phone.battery_health + '%' : ''}
              </p>

              {/* Prix */}
              <p style={{
                fontSize: '26px', fontWeight: '900',
                textAlign: 'center', lineHeight: '1',
                margin: '4px 0'
              }}>
                {prixFormate}
              </p>

              {/* IMEI */}
              <p style={{
                fontSize: '8px', color: '#444',
                textAlign: 'center', marginBottom: '4px'
              }}>
                {phone.imei || 'IMEI non renseigné'}
              </p>

              {/* Code barre */}
              {phone.imei && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <svg ref={barcodeRef} style={{ width: '100%', maxWidth: '200px' }}/>
                </div>
              )}
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-xl
                         text-gray-600 text-sm">
              Annuler
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2 bg-[#1B2A4A] text-white rounded-xl
                         text-sm font-bold hover:bg-[#00B4CC] transition-all">
              🖨️ Imprimer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

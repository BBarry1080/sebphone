// Script de synchronisation du stock réel depuis le fichier Excel
// Exécuter avec: node sync-stock.mjs

const SB   = 'https://iqvavzockhwtsbjkjixz.supabase.co/rest/v1/phones'
const KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdmF2em9ja2h3dHNiamtqaXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTY4NzAsImV4cCI6MjA5MTkzMjg3MH0.k05KMDTrawBwh-e14hu620GLt_nfoYCpAVW6VevJNOY'
const HDR  = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' }

async function del(id) {
  const r = await fetch(`${SB}?id=eq.${id}`, { method: 'DELETE', headers: HDR })
  console.log(`DELETE ${id} → ${r.status}`)
}

async function patch(id, data) {
  const r = await fetch(`${SB}?id=eq.${id}`, {
    method: 'PATCH', headers: HDR, body: JSON.stringify(data)
  })
  if (r.status !== 204) console.error(`PATCH ${id} → ${r.status} ${await r.text()}`)
  else console.log(`PATCH ${id} → OK`)
}

// ── ÉTAPE 1 : Supprimer les téléphones de test ──────────────────────────────
const TEST_IDS = [
  '9fe061a5-81a1-486e-a2b3-e8baa73f4556', // iPhone 12 Pro 256Go Or 520€ test
  '7f125b07-8526-4f96-9338-74548e155c03', // iPhone 12 Pro 128Go Argent 479€ test
  '1de1004f-a85d-41f6-97ba-92d495d9d4cd', // iPhone 12 Pro 128Go Bleu Pacifique 430€ test
  '92d2984b-7ee1-4f16-922b-94ee164033e4', // iPhone 12 Pro 128Go Bleu Pacifique 399€ test
  '9c74a228-7ee1-4f16-922b-94ee164033e4', // iPhone 14 128Go Rouge 649€ test
  'd18ee864-b170-4539-85c7-2a3f1a9e3c06', // iPhone 15 Plus 128Go Rose 499€ test
  '2153ba72-32bd-419e-8a40-b4b3e90156ed', // iPhone 8 Plus 64Go Or 100€ test
  '5fb1a4c2-417a-473c-8f24-d23c0e7685cf', // iPhone 15 Pro 256Go Titane bleu 550€ test
]

// ── ÉTAPE 2 : Mises à jour du stock réel ───────────────────────────────────
// Format : [id_supabase, { champs à mettre à jour }]
// grade: "Comme neuf" | "Très bon état" | "État correct" | null (reconditionné/neuf)
// condition: "occasion" | "reconditionne" | "neuf"
// benefit = price - purchase_price

const UPDATES = [
  // ── iPhone 7 ─────────────────────────────────────────────────────────────
  ['286d29d3-4742-45f1-ac76-95b39f0920bf', { // iP7 32Go Or rose 99€
    grade:'Comme neuf', battery_health:78, imei:'354828093611420',
    purchase_price:20, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['169476fc-7359-4341-97d7-6304b1e79361', { // iP7 32Go Noir 99€
    grade:'Comme neuf', battery_health:80, imei:'356391105001062',
    purchase_price:15, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone 8 ─────────────────────────────────────────────────────────────
  ['bc58efdf-8776-4b7c-b100-2da0c9685219', { // iP8 64Go Noir 99€
    grade:'Comme neuf', battery_health:80, imei:'356761086758197',
    purchase_price:40, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['38825425-d2ad-42a4-8976-aac7fd8c38c0', { // iP8 64Go Noir 129€
    grade:'Comme neuf', battery_health:94, imei:'356703089358732',
    purchase_price:50, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['7cb2a93d-a420-4d64-90c5-bd849414e07c', { // iP8 64Go Rouge 129€
    grade:'Comme neuf', battery_health:87, imei:'352990096236712',
    purchase_price:40, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['a0d5e90a-08d1-4930-9fcc-701c19d70b70', { // iP8 64Go Blanc 129€ USED
    condition:'occasion', grade:'Très bon état', battery_health:82,
    imei:'356761086758197', purchase_price:50, fournisseur:'SebPhone',
    stock_location:'Molenbeek', magasins:['molenbeek'],
  }],
  ['288aa7a9-9851-4270-ae71-380547aba6a6', { // iP8 256Go Noir 129€
    grade:'Comme neuf', battery_health:87, imei:'359497087027798',
    purchase_price:60, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone SE (2020) ──────────────────────────────────────────────────────
  ['7c5d528a-6376-4d4c-8806-f5cbb1903e55', { // SE 64Go Rouge 129€
    grade:'Comme neuf', battery_health:84, imei:'356725663365700',
    purchase_price:40, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['8e7d0441-b873-4dc3-99da-03f2a621693f', { // SE 64Go Noir 149€
    grade:'Comme neuf', battery_health:79, imei:'356494105914944',
    purchase_price:50, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['5640d930-3e5f-48ae-ad2b-af1172284112', { // SE 64Go Noir 129€
    grade:'Comme neuf', battery_health:84, imei:'357145411857628',
    purchase_price:40, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone X ─────────────────────────────────────────────────────────────
  ['9c421c03-3c1f-4325-ae15-2b5887191c10', { // X 64Go Noir 149€
    grade:'Comme neuf', battery_health:74, imei:'354875093519699',
    purchase_price:50, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['5a0a0e6e-a482-4a1a-be41-cafba7c0a72e', { // X 64Go Noir 169€
    grade:'Comme neuf', battery_health:100, imei:'356725083428005',
    purchase_price:65, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['a086e202-029f-4fb4-8b75-55284b15fdc4', { // X 64Go Gris sidéral 169€
    grade:'Comme neuf', battery_health:78, imei:'354870092524022',
    purchase_price:45, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['1354473a-bd73-44bb-8128-2fd153185dc9', { // X 64Go Gris sidéral 169€ (DISPO 23)
    grade:'Comme neuf', battery_health:87, imei:'354868093803072',
    purchase_price:45, fournisseur:'SebPhone', stock_location:'Autre',

  }],
  ['88252520-d5e0-43e9-92af-ada91aebf5af', { // X 64Go Argent 169€
    grade:'Comme neuf', battery_health:81, imei:'359406084937735',
    purchase_price:45, fournisseur:'SebPhone', stock_location:'Autre',

  }],

  // ── iPhone XS ─────────────────────────────────────────────────────────────
  ['f50be7fd-4250-410f-bce3-4c140a9efe89', { // XS 256Go → couleur Argent (pas Blanc)
    color:'Argent', grade:'Comme neuf', battery_health:73,
    imei:'353155101075021', purchase_price:0, fournisseur:'SebPhone',
    stock_location:'Molenbeek', magasins:['molenbeek'],
  }],

  // ── iPhone XR ─────────────────────────────────────────────────────────────
  ['d63b34b4-feb5-4603-8fc5-d8c0f6a23845', { // XR 64Go Blanc 189€
    grade:'Comme neuf', battery_health:83, imei:'356456101565392',
    purchase_price:55, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['ee11c52b-0904-416a-9648-99840021f465', { // XR 64Go Noir 189€
    grade:'Comme neuf', battery_health:84, imei:'353084106534644',
    purchase_price:60, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['070d7d42-897f-4de2-b1ec-b5642356307d', { // XR 64Go Noir 189€ (2ème)
    grade:'Comme neuf', battery_health:89, imei:'356457105234076',
    purchase_price:95, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['9a88a734-00c1-4ca6-b7ab-f838f71f5fb4', { // XR 128Go Noir 199€
    grade:'Comme neuf', battery_health:86, imei:'357356099485117',
    purchase_price:95, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 11 ─────────────────────────────────────────────────────────────
  ['cef36560-f03f-4d0f-b0ff-9969625df6d8', { // 11 64Go Noir 199€ occasion
    grade:'Comme neuf', battery_health:100, imei:'354001101448496',
    purchase_price:80, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['15e69ed1-a973-4e4d-a634-4fa5fa798715', { // 11 64Go Noir 199€ reconditionné (sans IMEI)
    battery_health:100, purchase_price:40, fournisseur:'SebPhone',
    stock_location:'Louise', magasins:['louise'],
  }],
  ['4795a5c8-db48-4096-bd91-b0f4ec43acf0', { // 11 64Go Noir 149€ — Face ID défaillant
    condition:'occasion', grade:'État correct', battery_health:97,
    imei:'357818703502504', purchase_price:70, fournisseur:'Molenbeek',
    stock_location:'Molenbeek', magasins:['molenbeek'],
    notes:'Face ID non fonctionnel'
  }],
  ['8fd22e64-6fb4-40f0-9daf-3688fda34a50', { // 11 64Go Noir 199€
    grade:'Comme neuf', battery_health:82, imei:'350293720306858',
    purchase_price:80, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['267c60f2-2c19-417f-8cf4-99016a5a7e93', { // 11 64Go Rouge 199€ (était reserve → disponible)
    status:'disponible', grade:'Comme neuf', battery_health:90,
    imei:'352914119808166', purchase_price:80, fournisseur:'SebPhone',
    stock_location:'Louise', magasins:['louise'],
  }],
  ['4212a595-d78b-452f-a122-b741bedc8576', { // 11 64Go Blanc 199€
    grade:'Comme neuf', battery_health:73, imei:'355091840312672',
    purchase_price:80, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['f6852a06-dfa8-4a43-b444-64b6394094ee', { // 11 256Go Blanc 199€
    grade:'Comme neuf', battery_health:73, imei:'353990101137433',
    purchase_price:70, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['99abde35-01db-4ef4-843d-b70ff614742a', { // 11 64Go Blanc 199€ (2ème)
    grade:'Comme neuf', battery_health:100, imei:'353989107263052',
    purchase_price:80, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['0a95ed1c-2727-4bf4-8631-525ca43a68b0', { // 11 128Go Noir 229€
    grade:'Comme neuf', battery_health:78, imei:'352224772989232',
    purchase_price:80, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['093f3c5f-91dd-46aa-85af-f782e7f4b4ab', { // 11 64Go Noir 199€ (note ZZ)
    grade:'Comme neuf', battery_health:95, imei:'358292241146274',
    purchase_price:0, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 11 Pro ─────────────────────────────────────────────────────────
  ['9f5cd665-d496-4203-8c9e-b5c0e23ce640', { // 11 Pro 64Go Or 289€
    grade:'Comme neuf', battery_health:100, imei:'353844102415209',
    purchase_price:135, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone 11 Pro Max ─────────────────────────────────────────────────────
  ['ced78219-4296-4205-85c6-b8e540cad078', { // 11 PM 64Go Blanc 299€
    grade:'Comme neuf', battery_health:85, imei:'353918108031176',
    purchase_price:125, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['711f8093-4458-487e-bb48-aa6ac5f2cc32', { // 11 PM 64Go Noir 299€
    grade:'Comme neuf', battery_health:86, imei:'353926108560581',
    purchase_price:145, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['cb23d12c-e308-4ada-a613-30777d9ecd34', { // 11 PM 64Go Or 299€
    grade:'Comme neuf', battery_health:78, imei:'353917108517382',
    purchase_price:125, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['9a44dd14-6519-4940-a46c-c062fcc5a27c', { // 11 PM 256Go Vert 329€ reconditionné
    battery_health:null, imei:'353916104309828',
    purchase_price:135, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 12 mini ────────────────────────────────────────────────────────
  ['b2160c06-0844-4ed7-86a0-fe50378722ac', { // 12m 256Go Noir 299€ reconditionné
    battery_health:76, imei:'352591130009360',
    purchase_price:75, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['1310bb7c-51f6-466d-9a6b-73db51715b34', { // 12m 128Go Violet 299€
    grade:'Comme neuf', battery_health:85, imei:'350404164424244',
    purchase_price:150, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['2991ce30-f9c0-47f2-bf08-68e3ae3a1a07', { // 12m 128Go Violet 299€ (2ème)
    grade:'Comme neuf', battery_health:73, imei:'354457524431156',
    purchase_price:60, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 12 ─────────────────────────────────────────────────────────────
  ['5207b58f-3d94-402c-a3bd-8cda866cd81e', { // 12 64Go Bleu 249€ reconditionné
    battery_health:84, imei:'353032119565568',
    purchase_price:150, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['b90b7f02-6ea4-446d-abc1-7cba9c2d6a75', { // 12 64Go Blanc 249€
    grade:'Comme neuf', battery_health:80, imei:'353490238628636',
    purchase_price:90, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['50b5d0ac-a000-4c72-9b38-c4e5dbba4131', { // 12 64Go Bleu 249€
    grade:'Comme neuf', battery_health:77, imei:'359708824643295',
    purchase_price:100, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['4873fa31-c8dd-492d-8c08-48712fdd28e0', { // 12 64Go Rouge 249€
    grade:'Comme neuf', battery_health:81, imei:'351066252393653',
    purchase_price:95, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['41fbc81c-bddd-456b-a725-fb3dbd0b6747', { // 12 128Go Noir 279€
    grade:'Comme neuf', battery_health:74, imei:'353057113952652',
    purchase_price:110, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['df46bec0-3118-4e58-8cb8-05089fbb9d16', { // 12 64Go Blanc 279€ — Face ID défaillant
    condition:'occasion', grade:'État correct', battery_health:100,
    imei:'357158816569128', purchase_price:110, fournisseur:'Molenbeek',
    stock_location:'SebPhone', notes:'Face ID non fonctionnel'
  }],
  ['c085e633-ed02-4216-8e51-55c14a8fc940', { // 12 64Go Violet 250€ heavily used
    condition:'occasion', grade:'État correct', battery_health:79,
    imei:'351365222930523', purchase_price:100, fournisseur:'Molenbeek',
    stock_location:'Molenbeek', magasins:['molenbeek'],
  }],

  // ── iPhone 12 Pro ─────────────────────────────────────────────────────────
  ['ca82dc99-b485-48a7-9bc2-0670e9fd5f12', { // 12 Pro 256Go Bleu Pacifique 349€
    grade:'Comme neuf', battery_health:94, imei:'356680112368914',
    purchase_price:150, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 13 ─────────────────────────────────────────────────────────────
  ['e3af0ecc-624f-4703-aed6-8d8b69d3722b', { // 13 128Go Blanc 299€ reconditionné
    battery_health:100, imei:'353504869344360',
    purchase_price:150, fournisseur:'Molenbeek', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone 14 ─────────────────────────────────────────────────────────────
  ['62af7d3e-b2de-4e48-a28c-9deb7f8f82f2', { // 14 128Go Noir 449€ occasion
    grade:'Comme neuf', battery_health:78, imei:'352937902571097',
    purchase_price:250, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['9e369dca-f5a8-4e77-af75-d83171b17fb0', { // 14 128Go Blanc 449€ reconditionné
    battery_health:95, imei:'358330278189179',
    purchase_price:200, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone 14 Plus ────────────────────────────────────────────────────────
  ['182a85a3-a0d5-46e9-a0be-42ca4e59485a', { // 14+ 128Go Noir 300€
    grade:'Comme neuf', battery_health:88, imei:'354692333502454',
    purchase_price:300, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['ee12cfb9-b2fe-44b5-80a4-5b7b1f3aeae7', { // 14+ 256Go Bleu 450€
    grade:'Comme neuf', battery_health:82, imei:'350979735399934',
    purchase_price:350, fournisseur:'Molenbeek', stock_location:'Louise',
    magasins:['louise'],
  }],
  ['689224e0-344c-4f8a-862d-369a29321220', { // 14+ 128Go Noir 350€ reconditionné
    battery_health:89, imei:'353981766090850',
    purchase_price:320, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 14 Pro ─────────────────────────────────────────────────────────
  ['7a011a87-1e8b-438d-a6de-3f93b36e618d', { // 14 Pro 128Go Noir 499€ reconditionné
    battery_health:100, imei:'358168480772619',
    purchase_price:310, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 14 Pro Max ────────────────────────────────────────────────────
  ['80ec6032-cb47-48df-823a-0f159e4af8bf', { // 14 PM 128Go Noir 550€ reconditionné
    battery_health:100, imei:'359265380710935',
    purchase_price:300, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 15 ─────────────────────────────────────────────────────────────
  ['60d6f89a-e91a-412a-a66b-c37899717fc0', { // 15 128Go Rose 550€ reconditionné
    battery_health:100, imei:'350355611967773',
    purchase_price:250, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 15 Plus ────────────────────────────────────────────────────────
  ['ca649d50-2efc-458b-a659-723e0a8189db', { // 15+ 128Go Noir 599€ reconditionné
    battery_health:96, imei:'350110766387651',
    purchase_price:240, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone 15 Pro ─────────────────────────────────────────────────────────
  ['a79c83e4-55cf-4735-b22c-393210bd4851', { // 15 Pro 128Go Bleu 649€
    grade:'Comme neuf', battery_health:99, imei:'357627941420084',
    purchase_price:380, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 16 ─────────────────────────────────────────────────────────────
  ['b0821461-cb93-4e4c-8e08-7cf9f45e4d4a', { // 16 128Go Noir 699€ neuf sous scellé
    battery_health:100, imei:'357140341283060',
    purchase_price:400, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['632f0a4d-d46c-431d-89d2-f0359e837ce0', { // 16 128Go Noir 649€ occasion
    grade:'Comme neuf', battery_health:100, imei:'355306357672452',
    purchase_price:400, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['f53dab28-d728-4294-9d7c-d8c5505e1731', { // 16 128Go Noir 649€ occasion (2ème)
    grade:'Comme neuf', battery_health:94, imei:'355769815336954',
    purchase_price:420, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 16 Pro ─────────────────────────────────────────────────────────
  ['f2603fda-9cbb-479a-a6e1-03b5cf9ad5ed', { // 16 Pro 128Go Noir 799€
    grade:'Comme neuf', battery_health:91, imei:'354707573331610',
    purchase_price:630, fournisseur:'SebPhone', stock_location:'Louise',
    magasins:['louise'],
  }],

  // ── iPhone 16 Pro Max ─────────────────────────────────────────────────────
  ['ee8e3366-461a-4e7b-9222-255d7b8aeaa7', { // 16 PM 256Go Blanc 850€
    grade:'Comme neuf', battery_health:94, imei:'358409815558383',
    purchase_price:480, fournisseur:'Molenbeek', stock_location:'Anderlecht',
    magasins:['anderlecht'], notes:'Réseau verrouillé'
  }],

  // ── iPhone 17 ─────────────────────────────────────────────────────────────
  ['996a9669-8fc1-4f3b-bf78-606661a5c49f', { // 17 256Go Violet 850€
    grade:'Comme neuf', imei:'354630184547129',
    purchase_price:600, fournisseur:'SebPhone', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],
  ['2bdff2a3-d4e8-4686-bf64-8f15bc5c9bf6', { // 17 256Go Blanc 950€ neuf sous scellé
    battery_health:100, imei:'352579438864461',
    purchase_price:700, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'],
  }],

  // ── iPhone 17 Pro Max ─────────────────────────────────────────────────────
  ['98ef1e1a-504e-4ead-a34b-007d49c1a85a', { // 17 PM 256Go Bleu 1150€
    grade:'Comme neuf', battery_health:100, imei:'350003563075365',
    purchase_price:600, fournisseur:'Molenbeek', stock_location:'Molenbeek',
    magasins:['molenbeek'], notes:'Réseau verrouillé'
  }],
]

// ── EXÉCUTION ──────────────────────────────────────────────────────────────
console.log('=== SUPPRESSION DES TÉLÉPHONES DE TEST ===')
for (const id of TEST_IDS) await del(id)

console.log('\n=== MISE À JOUR DU STOCK RÉEL ===')
for (const [id, data] of UPDATES) await patch(id, data)

console.log('\n✅ Synchronisation terminée!')

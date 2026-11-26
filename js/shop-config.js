/* Shop settings — the only file you need to edit to run the store.

   1. PRODUCTS  prices, names, colours, sizes.
   2. CHECKOUT  paste your Shopify store domain and each size's variant ID.
                Until that is filled in, the bag sends a "hold my hoodie"
                request to the inbox instead of taking payment.
   3. PIXELS    paste your Meta / TikTok / Google IDs. Empty = not loaded.
*/
window.SHOP = {
  currency: 'USD',
  freeShippingOver: 100,          // dollars; set 0 to hide the progress bar
  bundle: { qty: 2, percentOff: 15 }, // 2+ hoodies in the bag = 15% off each (needs a matching automatic discount in Shopify)
  shipsIn: 'Ships in 2–3 business days',
  returns: 'Free exchanges within 30 days',

  checkout: {
    // e.g. 'chef-saul.myshopify.com'. Empty = "hold my hoodie" mode (emails the order to the inbox).
    shopifyDomain: '',
    // Optional discount code added to every checkout link, e.g. 'BUNDLE15'.
    discountCode: '',
    // Where hold requests go while checkout is not connected.
    holdEmail: 'info@chefsaulmontiel.com'
  },

  pixels: {
    metaPixelId: '',      // Meta (Facebook / Instagram) Pixel ID, digits only
    tiktokPixelId: '',    // TikTok Pixel ID
    ga4Id: '',            // Google Analytics 4, 'G-XXXXXXX'
    gtmId: '',            // Google Tag Manager, 'GTM-XXXXXXX' (optional)
    pinterestTagId: '',   // Pinterest Tag ID (optional)
    snapPixelId: ''       // Snapchat Pixel ID (optional)
  },

  sizes: ['S', 'M', 'L', 'XL', '2XL'],

  // body: hoodie colour · ink: print colour · art: which print (see shop.js PRINTS)
  // variants: Shopify variant ID per size, e.g. { S: '44123456789', M: '…' }
  products: [
    {
      id: 'nopal', name: 'Nopal hoodie', price: 72, body: '#10382B', ink: '#DCEBA0', art: 'wordmark',
      blurb: 'Saúl’s name on the chest and his seal across the back, in deep nopal green.',
      badge: '', variants: {}
    },
    {
      id: 'chile', name: 'Chile hoodie', price: 72, body: '#E2471F', ink: '#FCF0EC', art: 'provecho',
      blurb: 'Chile red with “¡Buen provecho!” stacked across the back. Loud on purpose.',
      badge: '', variants: {}
    },
    {
      id: 'masa', name: 'Masa hoodie', price: 72, body: '#EFE2D4', ink: '#10382B', art: 'hidalgo',
      blurb: 'The colour of fresh masa. “Hecho en Hidalgo” on the back for the town he came from.',
      badge: '', variants: {}
    },
    {
      id: 'maiz', name: 'Maíz hoodie', price: 72, body: '#F0B53A', ink: '#10382B', art: 'seal',
      blurb: 'Maize yellow with a small seal on the chest and a big one on the back.',
      badge: '', variants: {}
    }
  ],

  details: [
    ['Fabric', '400 gsm brushed cotton fleece, 80% cotton / 20% polyester. Heavy, soft inside, holds its shape.'],
    ['Fit', 'Relaxed and a little boxy, with dropped shoulders. Take your usual size; size down for a closer fit.'],
    ['Print', 'Screen printed, so it won’t crack or peel.'],
    ['Care', 'Wash cold inside out. Tumble dry low or hang dry.']
  ],

  // Chest width and body length in inches, laid flat.
  sizeChart: [['S', 21, 27], ['M', 22.5, 28], ['L', 24, 29], ['XL', 25.5, 30], ['2XL', 27, 31]]
};

const domain = 'medpaid.myshopify.com';
const storefrontAccessToken = '6bf4b47384e7df722e04419bf899c609';

async function fetchAllProducts() {
  const endpoint = `https://${domain}/api/2023-10/graphql.json`;

  let hasNextPage = true;
  let cursor = null;
  const allProducts = [];

  while (hasNextPage) {
    const query = `
      query GetProducts($cursor: String) {
        products(first: 100, after: $cursor) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              title
              handle
              description
              images(first: 1) {
                edges {
                  node {
                    src
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = { cursor };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken
      },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    const products = result.data.products.edges;

    products.forEach(edge => {
      allProducts.push(edge.node);
    });

    hasNextPage = result.data.products.pageInfo.hasNextPage;
    cursor = products.length > 0 ? products[products.length - 1].cursor : null;
  }

  return allProducts;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loadProducts').addEventListener('click', async () => {
    const products = await fetchAllProducts();
    const container = document.getElementById('products');
    container.innerHTML = ''; // Clear previous content

    products.forEach(product => {
      const div = document.createElement('div');
      div.className = 'product';

      const image = product.images.edges[0]?.node.src || '';
      const price = product.variants.edges[0]?.node.price.amount || 'N/A';
      const currency = product.variants.edges[0]?.node.price.currencyCode || '';

      div.innerHTML = `
        <img src="${image}" alt="${product.title}" />
        <h3>${product.title}</h3>
        <p>${product.description.substring(0, 80)}...</p>
        <strong>${price} ${currency}</strong>
      `;

      container.appendChild(div);
    });
  });
});

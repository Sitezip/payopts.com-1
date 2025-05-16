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
                    id
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

  core.cr.setData('prods', allProducts);

  return allProducts;
}

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  const button = document.getElementById('loadProducts');
  const container = document.getElementById('products');

  button.addEventListener('click', async () => {
    loader.style.display = 'block';
    button.disabled = true;
    container.innerHTML = '';

    try {
      const products = await fetchAllProducts();

      document.querySelector('h1 > span').innerText = `Total Products: ${products.length}`;

      products.forEach(product => {
        console.log(product);
        const image = product.images.edges[0]?.node.src || '';
        const price = product.variants.edges[0]?.node.price.amount || 'N/A';
        const currency = product.variants.edges[0]?.node.price.currencyCode || '';
        const variantId = product.variants.edges[0]?.node.id || '';

        const div = document.createElement('div');
        div.className = 'product';

        div.innerHTML = `
          <img src="${image}" alt="${product.title}" />
          <h3>${product.title}</h3>
          <p>${product.description.substring(0, 80)}...</p>
          <strong>${price} ${currency}</strong>
          <button class="buyNowBtn" onclick="buyNow('${variantId}')">Add to Cart</button>
        `;

        container.appendChild(div);
      });

    } catch (error) {
      container.innerHTML = `<p style="color:red;">Error loading products.</p>`;
      console.error(error);
    } finally {
      loader.style.display = 'none';
      button.disabled = false;
    }
  });
});

async function buyNow(variantId) {
  try {
    const checkoutUrl = await createCheckout([{ variantId, quantity: 1 }]);
    //const checkoutUrl = await createCartWithCustomerInfo([{ variantId, quantity: 1 }]);
    window.location.href = checkoutUrl || '#'; // Redirect user to Shopify-hosted checkout
  } catch (err) {
    alert("Failed to create checkout.");
  }
}

async function createCheckout(cart=[]) {
  cart = cart.length ? cart : core.cr.getData('cart');
  if (!cart.length) {
    alert("No items in cart.");
    return;
  }

  const endpoint = `https://${domain}/api/2023-10/graphql.json`;

  const query = `
    mutation checkoutCreate($input: CheckoutCreateInput!) {
      checkoutCreate(input: $input) {
        checkout {
          id
          webUrl
        }
        checkoutUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const lineItems = cart.map(item => ({
    variantId: item.variantId,
    quantity: item.quantity
  }));

  const variables = {
    input: {
      email: "medpaid@payopts.com",
      lineItems: lineItems,
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontAccessToken
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();

  if (result.data?.checkoutCreate?.checkout?.webUrl) {
    console.log('Redirect user to complete order:', result.data.checkoutCreate.checkout.webUrl);
    window.open(result.data.checkoutCreate.checkout.webUrl, "shopify-checkout");
    return result.data.checkoutCreate.checkout.webUrl;
  } else {
    console.error('Error creating checkout:', result);
    throw new Error('Checkout creation failed.');
  }
}

document.getElementById('createOrderBtn').addEventListener('click', async () => {
  try {
    const checkoutUrl = await createCheckout();
    window.location.href = checkoutUrl; // Redirect user to Shopify-hosted checkout
  } catch (err) {
    alert("Failed to create checkout.");
  }
});

async function createCartWithCustomerInfo(cart=[], cust={}) {
  
  if (!cart.length) {
    alert("No items in cart.");
    return;
  }

  const endpoint = `https://${domain}/api/2023-10/graphql.json`;

  // Step 1: Create the cart
  const createCartQuery = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          createdAt
          lines(first: 5) {
            edges {
              node {
                id
                quantity
              }
            }
          }
        }
        userErrors {
          message
        }
      }
    }
  `;
  
  const lineItems = cart.map(item => ({
    variantId: item.variantId,
    quantity: item.quantity
  }));

  const createCartVariables = {
    input: {
      email: "customer@example.com",
      lineItems: lineItems,
    }
  };

  const cartCreateResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontAccessToken
    },
    body: JSON.stringify({ query: createCartQuery, variables: createCartVariables })
  });

  const cartCreateResult = await cartCreateResponse.json();
  const cartId = cartCreateResult?.data?.cartCreate?.cart?.id;

  if (!cartId) {
    console.error('Failed to create cart:', cartCreateResult);
    return;
  }

  console.log('Cart created:', cartId);

  // Step 2: Update buyer identity with email + delivery address
  const updateBuyerIdentityQuery = `
    mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart {
          id
          buyerIdentity {
            email
            deliveryAddressPreferences {
              ... on MailingAddress {
                address1
                city
                province
                zip
                country
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const updateBuyerVariables = {
    cartId,
    buyerIdentity: {
      email: "customer@example.com",
      deliveryAddressPreferences: [
        {
          deliveryAddress: {
            address1: "123 Main St",
            city: "New York",
            province: "NY",
            zip: "10001",
            country: "US"
          }
        }
      ]
    }
  };

  const buyerUpdateResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': storefrontAccessToken
    },
    body: JSON.stringify({ query: updateBuyerIdentityQuery, variables: updateBuyerVariables })
  });

  const buyerUpdateResult = await buyerUpdateResponse.json();

  if (buyerUpdateResult.data?.cartBuyerIdentityUpdate?.cart) {
    console.log('Customer info added to cart:', buyerUpdateResult.data.cartBuyerIdentityUpdate.cart);
  } else {
    console.error('Failed to update buyer identity:', buyerUpdateResult);
  }
}


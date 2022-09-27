const stripe = require('stripe')(process.env.STRIPE_API_KEY);

function formatSG(stripeAmount) {
    return `$${(stripeAmount / 100).toFixed(2)}`;
}

function formatStripeAmount(SGString) {
    return parseFloat(SGString) * 100;
}

function getAllProductsAndPlans() {
    return Promise.all(
        [
            stripe.products.list({}),
            stripe.plans.list({})
        ]
    ).then(stripeData => {
        var products = stripeData[0].data;
        var plans = stripeData[1].data;

        plans = plans.sort((a, b) => {
            /* Sort plans in ascending order of price (amount)
              * Ref: https://www.w3schools.com/js/js_array_sort.asp */
            return a.amount - b.amount;
        }).map(plan => {
            /* Format plan price (amount) */
            amount = formatSG(plan.amount)
            return { ...plan, amount };
        });

        products.forEach(product => {
            const filteredPlans = plans.filter(plan => {
                return plan.product === product.id;
            });

            product.plans = filteredPlans;
        });

        return products;
    });
}

module.exports = {
    formatSG,
    formatStripeAmount,
    getAllProductsAndPlans
};
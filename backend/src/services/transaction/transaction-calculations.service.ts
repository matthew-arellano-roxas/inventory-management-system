export function getItemTotalCost(cost: number, quantity: number) {
  return cost * quantity;
}

export function getItemTotalPrice(price: number, quantity: number) {
  return price * quantity;
}

export function getProfitAmount(costPerUnit: number, sellingPrice: number, quantity: number) {
  return (sellingPrice - costPerUnit) * quantity;
}

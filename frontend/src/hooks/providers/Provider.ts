export const GAS_PRICE_LIMIT = 200000

export interface Provider<T>{
  getLibrary(): T
  getBalance(address: string): Promise<Number>
}


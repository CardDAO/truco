export const walletParser = (wallet: string): string => {
  return `
    ${wallet.substring(0, 6)}
    ...
    ${wallet.substring(wallet.length - 5)}
  `
}

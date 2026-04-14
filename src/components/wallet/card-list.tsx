// Thin re-export shim — WalletStack is the new implementation.
// wallet/page.tsx imports CardList so this keeps that import working.
export { WalletStack as CardList } from "./wallet-stack";

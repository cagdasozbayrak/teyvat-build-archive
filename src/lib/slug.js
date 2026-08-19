// The default slug form the external sources key on. Lowercase, apostrophes and dots
// dropped, spaces to hyphens, so "Hu Tao" becomes "hu-tao". Callers override it where a
// source disagrees. portraits.js keeps SLUG_OVERRIDE for jmp.blue, and roster.js takes an
// explicit slug as a row's 6th field.
export const slugify = (name) => name.toLowerCase().replace(/['.]/g, "").replace(/\s+/g, "-");

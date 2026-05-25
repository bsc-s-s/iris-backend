type ClassValue = string | number | boolean | null | undefined | ClassDictionary | ClassArray;
interface ClassDictionary { [id: string]: boolean | undefined | null; }
interface ClassArray extends Array<ClassValue> {}

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === 'string') { classes.push(input); continue; }
    if (Array.isArray(input)) { classes.push(cn(...input)); continue; }
    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}

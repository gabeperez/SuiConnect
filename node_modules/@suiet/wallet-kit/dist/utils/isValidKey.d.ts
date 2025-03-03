export default function isValidKey(key: number | string, object: object): key is keyof typeof object;

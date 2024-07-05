export function removeMask(number) {
    return number.replace(/[^\d]/g, '');
}
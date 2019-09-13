
export default function filter(input = [], itemFilter = []) {
  if (input && input.length) {
    let out = input.filter(item => item && itemFilter.indexOf(item) < 0)
    return out
  }
  return []
}

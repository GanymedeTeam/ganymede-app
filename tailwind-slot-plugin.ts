import createPlugin from 'tailwindcss/plugin'

export default createPlugin(({ matchVariant }) => {
  // slot-[slot] -> [data-slot=$slot]
  matchVariant('slot', (slot) => {
    return `[data-slot="${slot}"]`
  })
  // slot-[slot] -> &[data-slot=$slot]
  matchVariant('self-slot', (slot) => {
    return `&[data-slot="${slot}"]`
  })
})

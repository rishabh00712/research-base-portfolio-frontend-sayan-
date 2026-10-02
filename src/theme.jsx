// theme.jsx
const theme = {
  colors: {
    background: '#F4F5F7',
    selectionBackground: '#5C3A21',
    // News
    newsBg: '#EEDDDF',
    newsBorder: '#DDB8BE',
    newsBorderStrong: '#B92E48',
    textPrimary: '#5C3A21',
    textActive: '#D2691E',
    textHover: '#3E2723',
    textSelection: '#ffffff',
    // Explore cards
    cardDark: '#9A2139',
    cardLight: '#B92E48',
    dot: 'rgba(107, 98, 102, 0.18)',
    // Home page additions
    accent: '#9B1C2E', // "WELCOME TO THE" crimson
    heading: '#231F20', // big serif title
    body: '#6B6266', // paragraph text
    glow: 'rgba(155, 28, 46, 0.08)', // soft glow behind the photo
    iconBorder: '#ECE7E6',

    // Dr. Ferrocene hero: ball colors
    heroBallLight: '#E6E1DA', // shadowy white (keep first: it also tints the moving light)
    heroBallChocolate: 'rgb(155, 28, 46)', // crimson
    heroBallDark: '#1C1C1C', // hazy black

    // Dr. Ferrocene hero: name + description (no background block)
    heroBlock: 'transparent',
    heroCardShadow: 'none',
    heroText: 'rgb(155, 28, 46)', // name: crimson
    heroTextSoft: '#4A4044', // description: dark warm grey

    // Hobby pills
    heroTagBg: 'rgb(238, 221, 223)', // light pink background
    heroTagBorder: 'rgba(155, 28, 46, 0.45)', // thin red border
    heroTagText: 'rgb(155, 28, 46)', // crimson text

    // Footer
    footerBg: '#E9EAEC', // a little gray (darker than the page background)
    footerBorder: '#D5D7DB', // top line of the footer

    // Footer: affiliation tags
    affilBg: 'rgb(238, 221, 223)', // light pink background
    affilBorder: 'rgba(155, 28, 46, 0.45)', // thin red border
    affilText: 'rgb(155, 28, 46)', // crimson text

    // Emoji reaction bar (warm reds / browns / ambers, no green)
    emojiBarBg: '#EEDDDF', // pill background (same pink as news)
    emojiBarBorder: '#DDB8BE', // pill border + divider
    emojiShadow: 'rgba(92, 58, 33, 0.18)', // brown drop shadow
    emojiShadowSoft: 'rgba(92, 58, 33, 0.10)', // collapsed (dimmed) shadow
    emojiTooltipBg: '#3E2723', // dark chocolate tooltip
    emojiTooltipText: '#ffffff',
    emojiBadgeBg: '#9B1C2E', // crimson count badge
    emojiBadgeText: '#ffffff',
    emojiSelectedRing: '#9B1C2E', // ring on the emoji you picked
    emojiMuted: '#6B6266', // total chip / arrows
    emojiError: '#B92E48', // error text
    // First-visit loader (crimson curtain + big counter)
    loaderBg: '#9B1C2E', // curtain
    loaderBgEdge: '#9A2139', // slightly darker bottom edge while it lifts
    loaderText: '#EEDDDF', // counter + label (blush)
    loaderTextSoft: 'rgba(238, 221, 223, 0.65)',
    loaderTrack: 'rgba(238, 221, 223, 0.2)', // progress line track
    loaderBar: '#EEDDDF', // progress line fill
    // Gradient pair (from -> to) behind each emoji
    reactions: {
      wow: { from: '#F6C9A0', to: '#D2691E' }, // peach -> burnt orange
      happy: { from: '#F9DDB8', to: '#E8A25C' }, // cream -> amber
      meh: { from: '#E6D3C3', to: '#B58B6B' }, // sand -> cocoa
      pleading: { from: '#EEDDDF', to: '#DDB8BE' }, // blush -> rose
      sad: { from: '#E7B8C0', to: '#B92E48' }, // rose -> crimson
    },
  },
  fonts: {
    main: '"Space Mono", "Courier New", Courier, monospace',
    heading: '"Fraunces", Georgia, "Times New Roman", serif',
    body: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    size: '0.85rem',
    letterSpacing: '1.5px',
  },
  spacing: {
    navGap: '2.5rem',
    padding: '24px 48px',
  },
};

export default theme;
// Team logo styling — tweak these and rebuild to compare how logos look
// (see TeamLogo.tsx, the only place these are read). Comment out a value
// (or set it to undefined) to disable that aspect entirely: no border, or
// no background color, respectively — logos then render on whatever
// background sits behind them.
// export const LOGO_BORDER: string | undefined = '1px solid var(--mantine-color-default-border)'
export const LOGO_BORDER: string | undefined = undefined
export const LOGO_BACKGROUND: string | undefined = 'white'
// export const LOGO_BACKGROUND: string | undefined = undefined

// Extra padding around the crest, as a fraction of the logo's size (0 = the
// image fills the box edge-to-edge on its longer axis, padded only on the
// shorter axis by object-fit: contain itself if the source isn't square;
// higher values add uniform padding on every side on top of that).
export const LOGO_PADDING_RATIO = 0.05

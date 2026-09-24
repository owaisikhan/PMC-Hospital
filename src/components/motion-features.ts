// The animation engine, in its own file so it can be split into a separate
// chunk and fetched after the page is on screen (see motion-provider.tsx).
// domMax rather than domAnimation because the sliding tab pill uses layoutId,
// which needs the layout-animation features.
import { domMax } from "motion/react"

export default domMax

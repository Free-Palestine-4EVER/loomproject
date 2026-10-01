// This page varies only for Meta's link-preview crawler. Keep the rest of the
// site prerendered, while letting this route reject preview fetches at request
// time so Instagram can leave the pasted URL as a plain link.
export const prerender = false

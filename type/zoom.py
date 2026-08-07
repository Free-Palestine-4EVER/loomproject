import sys, preview, glyphs as G
gl = G.build_glyphs()
names = sys.argv[1:] or ['S']
cols = 2; cell = 900
rows = (len(names)+cols-1)//cols
parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {cols*cell} {rows*cell}" width="{cols*cell//2}" height="{rows*cell//2}"><rect width="100%" height="100%" fill="#fff"/>']
for i,n in enumerate(names):
    p,adv = gl[n]
    cx = (i%cols)*cell + (cell-adv)/2 + G.SB
    cy = (i//cols)*cell + cell*0.80
    parts.append(f'<rect x="{(i%cols)*cell}" y="{(i//cols)*cell}" width="{cell}" height="{cell}" fill="none" stroke="#ddd"/>')
    parts.append(f'<path d="{preview.path_to_d(p,cx,cy)}" fill="#111"/>')
parts.append('</svg>')
open('out/zoom.svg','w').write('\n'.join(parts))

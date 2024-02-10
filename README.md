# thib-o75.github.io

This tool converts SVG files to Anycubic Photon's PWS files.
It's a converter from .svg to .pws.
-In EasyEda, click on file/export SVG.
-Leave the size to 1x
-Choose black on white if you want to expose your traces or on white on black if you want to expose the copper to remove.
-Select the layers you want to expose.
-On this tool, set your exposure time
-Upload your file

That's it. Your .pws file is in your download folder. It's time to burn some copper.

Right now the caracteristics of the printer are hard coded, to use it with another printer, you have to clone the folder and edit the width and height of the canvas to fit your printer. Be careful, the screen could be in portrait orientation, if your .pws looks like glitches, try to invert the width and height or play with the orientation of the canvas.

# Wavatar

## A web component based profile picture editor

Scale, crop and save uploaded profile pictures easily with as simple and flexible web component. Load an image then pan and zoom with the mouse wheel. Then export the cropped image.

The component can be included with a simple script tag, or download and link the code yourself.

```html
<script src="https://davenicholson-xyz.github.io/dist/wavatar/wavatar-latest.min.js"></sript>
```

## Basics

Simply add the web component to your page, included a `src` for the initial image.

```html
<w-avatar
  width="250"
  height="250"
  src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=960&auto=format&fit=crop"
></w-avatar>
```

## Loading a new image

The image can be changed by calling the `fileSelect` method on the wavatar component. In the example the file selector dialog is called by double clicking the wavatar.

```javascript
const wavatar = document.querySelector("w-avatar");
wavatar.addEventListener("dblclick", wavatar.fileSelect);
```

## Saving the new image

Once the image has been cropped and zoomed to the required position the canvas image can then be exported to either anther `img` tag or as a `blob` for example uploading to a server. Call either `toPNG`, `toJPG` or `toBlob` on the wavatar element. `toBlob` takes a callback function passing in the resulting Blob.

```javascript
img.src = wavatar.toPNG();
```

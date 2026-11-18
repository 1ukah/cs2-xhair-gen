// Both views use the same photograph. Let the browser keep the small source in
// settings and select the 1440p original when the immersive view needs it.
export function mapImageSource(image) {
  function measure() {
    const { width, height } = image.getBoundingClientRect();
    if (width && height) {
      // object-fit: cover may scale by height, especially on a portrait phone.
      image.sizes = `${Math.ceil(Math.max(width, height * 16 / 9))}px`;
    }
  }
  measure();
  new ResizeObserver(measure).observe(image);
  return id => {
    const compact = `./assets/maps/${id}.webp`;
    image.srcset = `${compact} 1280w, ./assets/maps/large/${id}.webp 2560w`;
    image.src = compact;
  };
}

export function mapImageSource(image) {
  function measure() {
    const { width, height } = image.getBoundingClientRect();
    if (width && height) {
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

/**
 * Sample images for testing the damage assessment feature.
 * Users can click any image to test how the AI classifies it.
 */

export interface SampleImage {
  id: string;
  filename: string;
  url: string;
}

export const SAMPLE_IMAGES: SampleImage[] = [
  { id: 'img-01', filename: 'destroyed-tornado.jpg', url: '/samples/destroyed-tornado.jpg' },
  { id: 'img-02', filename: 'destroyed-tornado-2.jpg', url: '/samples/destroyed-tornado-2.jpg' },
  { id: 'img-03', filename: 'destroyed-sandy.png', url: '/samples/destroyed-sandy.png' },
  { id: 'img-04', filename: 'destroyed-coastal.jpeg', url: '/samples/destroyed-coastal.jpeg' },
  { id: 'img-05', filename: 'flood-puerto-rico.webp', url: '/samples/flood-puerto-rico.webp' },
  { id: 'img-06', filename: 'flood-florence.jpg', url: '/samples/flood-florence.jpg' },
  { id: 'img-07', filename: 'roof-damage-milton.webp', url: '/samples/roof-damage-milton.webp' },
  { id: 'img-08', filename: 'aerial-roof-damage.jpg', url: '/samples/aerial-roof-damage.jpg' },
  { id: 'img-09', filename: 'major-roof-damage.webp', url: '/samples/major-roof-damage.webp' },
  { id: 'img-10', filename: 'flood-neighborhood.jpeg', url: '/samples/flood-neighborhood.jpeg' },
  { id: 'img-11', filename: 'roof-damage-coastal.jpeg', url: '/samples/roof-damage-coastal.jpeg' },
  { id: 'img-12', filename: 'tree-on-porch.jpeg', url: '/samples/tree-on-porch.jpeg' },
  { id: 'img-13', filename: 'damaged-foundation.jpeg', url: '/samples/damaged-foundation.jpeg' },
  { id: 'img-14', filename: 'yard-debris-irma.jpg', url: '/samples/yard-debris-irma.jpg' },
  { id: 'img-15', filename: 'yard-debris-cleanup.jpg', url: '/samples/yard-debris-cleanup.jpg' },
  { id: 'img-16', filename: 'yard-cleanup-volunteers.jpeg', url: '/samples/yard-cleanup-volunteers.jpeg' },
  { id: 'img-17', filename: 'tree-in-yard.jpeg', url: '/samples/tree-in-yard.jpeg' },
  { id: 'img-18', filename: 'yard-debris-curb.jpeg', url: '/samples/yard-debris-curb.jpeg' },
  { id: 'img-19', filename: 'intact-house.jpg', url: '/samples/intact-house.jpg' },
  { id: 'img-20', filename: 'fema-trailer.jpeg', url: '/samples/fema-trailer.jpeg' },
];

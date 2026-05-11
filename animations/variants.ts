export const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" }
};

export const floatCard = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" }
  }
};

export const breathe = {
  animate: {
    scale: [1, 1.045, 1],
    opacity: [0.74, 1, 0.74],
    transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
  }
};

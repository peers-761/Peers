/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Safety net for the PDF reader: make sure the pdfjs files are always
    // packaged with the function that uses them on Vercel.
    outputFileTracingIncludes: {
      "/api/online-tests/analyze-pdf": ["./node_modules/pdfjs-dist/legacy/build/**"],
    },
  },
};

module.exports = nextConfig;

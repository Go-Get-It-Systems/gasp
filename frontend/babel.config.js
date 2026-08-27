module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    env: {
      test: {
        plugins: ['@babel/plugin-transform-dynamic-import'],
      },
    },
  };
};

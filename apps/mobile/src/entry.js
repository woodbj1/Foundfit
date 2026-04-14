// Diagnostic entry point: wraps expo-router/entry in error handling
// so we can see the actual crash message instead of a native SIGABRT.
// IMPORTANT: No top-level imports! Everything uses require() so it's
// inside the try/catch scope.

let _startupError = null;

// Intercept fatal errors at the JS level before they reach RCTFatal
const _ErrorUtils = globalThis.ErrorUtils;
if (_ErrorUtils && _ErrorUtils.setGlobalHandler) {
  _ErrorUtils.setGlobalHandler(function (error, isFatal) {
    if (!_startupError) {
      _startupError = error;
    }
    // Swallow the error so RCTFatal is not called
    console.error('[FoundFit] Intercepted startup error:', error);
  });
}

try {
  require('expo-router/entry');
} catch (error) {
  _startupError = error;
  console.error('[FoundFit] Caught startup error:', error);

  try {
    var React = require('react');
    var RN = require('react-native');

    function FoundFitErrorScreen() {
      var msg = _startupError
        ? _startupError instanceof Error
          ? _startupError.message + '\n\n' + (_startupError.stack || '')
          : String(_startupError)
        : 'Unknown error';

      return React.createElement(
        RN.View,
        { style: { flex: 1, backgroundColor: '#fbf6fd', justifyContent: 'center', padding: 24 } },
        React.createElement(
          RN.ScrollView,
          { contentContainerStyle: { gap: 12 } },
          React.createElement(
            RN.Text,
            { style: { fontSize: 24, fontWeight: '800', color: '#241033' } },
            'FoundFit Startup Error'
          ),
          React.createElement(
            RN.Text,
            { style: { fontSize: 13, color: '#6c587c', lineHeight: 20, fontFamily: 'Courier' } },
            msg
          ),
          React.createElement(
            RN.Text,
            { style: { fontSize: 12, color: '#999', marginTop: 20 } },
            'Screenshot this screen and send it to support.'
          )
        )
      );
    }

    RN.AppRegistry.registerComponent('main', function () {
      return FoundFitErrorScreen;
    });
  } catch (fallbackError) {
    console.error('[FoundFit] Could not render error screen:', fallbackError);
  }
}

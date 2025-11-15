
import {
  FluentProvider,
  webLightTheme
} from "@fluentui/react-components"

import UploadPage from "./presentation/pages/upload-page"

function App() {


  return (
    <>
     <FluentProvider theme={webLightTheme}>
      <UploadPage/>
      </FluentProvider>
    </>
  )
}

export default App

import { Spinner } from "@fluentui/react-components"
export const FullScreenLoader = ({message="Cargando ..."}:{message:string}) => (
  
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(255,255,255,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000
  }}>

    <Spinner size="extra-large" label={message} />
  </div>
  
  
)
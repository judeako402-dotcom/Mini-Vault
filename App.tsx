import NeuralCanvas from './components/NeuralCanvas'
import HUD from './components/HUD'
import NoteEditor from './components/NoteEditor'
import ReviewOverlay from './components/ReviewOverlay'

export default function App() {
  return (
    <>
      <NeuralCanvas />
      <HUD />
      <NoteEditor />
      <ReviewOverlay />
    </>
  )
}

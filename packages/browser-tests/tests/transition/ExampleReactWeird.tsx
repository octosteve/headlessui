import { useState } from 'react'
import { Transition } from '@headlessui/react'

export default function Example() {
  const [isShowing, setIsShowing] = useState(false)

  return (
    <div>
      <style>{`
				.visible { opacity: 1; }
				.invisible { opacity: 0; }

				.block {
					height: 200px;
					width: 200px;

					transition: opacity ease 1500ms;
					background-color: #ddd;
				}
			`}</style>
      <button
        style={{ zIndex: '1', position: 'relative' }}
        onClick={() => setIsShowing((isShowing) => !isShowing)}
        data-test-id="toggle"
      >
        Toggle
      </button>
      <div style={{ position: 'relative' }}>
        <Transition
          show={isShowing}
          unmount={false}
          enterFrom="invisible"
          enterTo="visible"
          leaveFrom="visible"
          leaveTo="invisible"
          className="block"
        >
          {'menu'}
        </Transition>
      </div>
    </div>
  )
}
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';

import { Canvas, useThree, useFrame, extend, } from "@react-three/fiber";
import { useRef, useLayoutEffect, useEffect, useState } from "react";
import { useTransform, useScroll, useTime } from "framer-motion";
import { degreesToRadians, progress, mix } from "popmotion";

import { useNavigate } from 'react-router-dom';

import rubik from '../../assets/rubik.json'

import fathanLogo from '../../assets/images/fathan-logo.jpg'
import LinkProjects from '../LinkProjects'

import "./styles.scss";

extend({ TextGeometry })

const blue = "#4d72c0"

const Icosahedron = () => {
  const font = new FontLoader().parse(rubik)
  const textOptions = {
    font,
    size: 1,
    height: 0.6,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 2,
  }
  const text_texture = new THREE.TextureLoader().load(fathanLogo)
    text_texture.wrapS = THREE.RepeatWrapping
    text_texture.wrapT = THREE.RepeatWrapping
    text_texture.repeat.set(0.1, 0.1);

  return (
    <mesh position={[-1, 0.7, 0]}>
      <textGeometry args={['FN', textOptions]} />
      <meshStandardMaterial
        wireframe
        attach='material'
        color={blue}
        //args={[{ map: text_texture }]}
     />
    </mesh>
  )
}

const Star = ({ p }) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const distance = mix(2, 3.5, Math.random());
    const yAngle = mix(
      degreesToRadians(80),
      degreesToRadians(100),
      Math.random()
    );
    const xAngle = degreesToRadians(360) * p;
    !ref.current.position.setFromSphericalCoords(distance, yAngle, xAngle);
  });

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
      <meshBasicMaterial wireframe color={blue} />
    </mesh>
  );
};

function Scene({ numStars = 100 }) {
  const gl = useThree((state) => state.gl);
  const { scrollYProgress } = useScroll();
  const yAngle = useTransform(
    scrollYProgress,
    [0, 1],
    [0.001, degreesToRadians(180)]
  );
  const distance = useTransform(scrollYProgress, [0, 1], [10, 3]);
  const time = useTime();

  useFrame(({ camera }) => {
    camera.position.setFromSphericalCoords(
      distance.get(),
      yAngle.get(),
      time.get() * 0.0005
    );
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  });

  useLayoutEffect(() => gl.setPixelRatio(0.3));

  const stars = [];
  for (let i = 0; i < numStars; i++) {
    stars.push(<Star p={progress(0, numStars, i)} />);
  }

  return (
    <>
      <Icosahedron />
      {stars}
    </>
  );
}

export default function Home() {
  const navigateTo = useNavigate()
  const [atBottom, setAtBottom] = useState(false)

  const detectBottom = (element) => element.getBoundingClientRect().bottom <= window.innerHeight + 400
  
  const handleScroll = () => {
    const element = document.getElementById('home')
    
    if (!atBottom && detectBottom(element)) {
      setAtBottom(true)
      navigateTo('/about')
    }

    if (!detectBottom(element)) setAtBottom(false)
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <>
      <main id="home" className="test">
        <div className="container">
          <Canvas gl={{ antialias: false }}>
            <Scene />
            <pointLight position={[0, 2, 1]} />
            <ambientLight intensity={1} />
          </Canvas>
        </div>
      </main>
      <div className="footer">
        <LinkProjects title="Scroll" path="/about" />
      </div>
    </>
  );
}

import React from "react"
import Config from "./config"
import App from "./App"
import {
    Collapse,
    Navbar,
    NavbarToggler,
    NavbarBrand,
    Nav,
    NavItem,
    NavLink, Modal, ModalHeader, ModalBody, ModalFooter
} from 'reactstrap';

export default class Main extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            isOpen: false,
        };
    }
    toggleModal = () => {
        this.setState({ isOpen: !this.state.isOpen });
    };

    render() {
        return (
            <div id="display">
                <div className="navB">

                    <Navbar expand="md" className='Navbar' color="white" fixed="top">

                        <NavbarBrand >
                            {/* <img src={logo} id='logo' alt={"SMU"} /> */}
                        </NavbarBrand>
                        <NavbarToggler />
                        <Collapse navbar>
                            <Nav className="ml-auto" navbar>
                                <NavItem className='nav-item'>

                                    <NavLink to="/contact" onClick={this.toggleModal}>Home</NavLink>
                                    <Modal isOpen={this.state.isOpen}>
                                        <ModalHeader toggle={this.toggleModal}><Config/></ModalHeader>
                                        
                                    </Modal>
                                </NavItem>

                            </Nav>
                        </Collapse>
                    </Navbar>
                </div>
                <Config />
                {/* <div id="graphDock">
                    <App />
                </div> */}
            </div>
        )
    }
}
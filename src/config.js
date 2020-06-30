import React from "react"
import App from "./App"
import {
    Collapse,
    Navbar,
    NavbarToggler,
    NavbarBrand,
    Nav,
    NavItem,
    NavLink, Modal, ModalHeader, ModalBody, ModalFooter, Col, Button, Form, FormGroup, Label, Input
} from 'reactstrap';
import { FiSettings } from 'react-icons/fi';
import { MdVpnKey } from 'react-icons/md';
import companylogo from './assets/logo_white.png'


export default class Config extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            ip: "localhost",
            password: "12345",
            port: "7474",
            hidden: false,
            display: "Config",
            isOpen: true,
            connected: false
        }
        this.handleClick = this.handleClick.bind(this)
        this.toggleShow = this.toggleShow.bind(this)
        this.paramChange = this.paramChange.bind(this)
    }
    toggleModal = () => {
        this.setState({ isOpen: !this.state.isOpen });
    };

    handleClick(e) {

        this.setState({ display: "dashboard",connected: !this.state.connected })
        


    }

    toggleShow() {
        this.setState({ hidden: !this.state.hidden })
    }

    paramChange(e) {
        this.setState({ ...this.state, [e.target.name]: e.target.value })
    }

    render() {

        return (
            <div className="row" style={{
                "background": "#f5f6f8"
            }}>
                <div className="navB">

                    <Navbar expand="md" className='Navbar' color="white" fixed="top">

                        <NavbarBrand >
                            <img src={companylogo} id='logo' alt={"NSE"} />
                        </NavbarBrand>
                        <NavbarToggler />
                        <Collapse navbar>
                            <Nav className="ml-auto" navbar>
                                <NavItem className='nav-item'>

                                    <NavLink  onClick={this.toggleModal}><FiSettings className="spin-icon" style={{
                                        "height": "1.4em",
                                        "width": "1.5em",
                                    }} /></NavLink>
                                    <Modal isOpen={this.state.isOpen}>
                                        <ModalHeader toggle={this.toggleModal}>

                                            Connection
                                        </ModalHeader>
                                        <ModalBody>

                                            <Form>
                                                <FormGroup row>
                                                    <Label for="ip" sm={2}>IP</Label>
                                                    <Col sm={10}>
                                                        <Input type="text" name="ip"  onChange={this.paramChange} placeholder="127.0.0.1" />
                                                    </Col>
                                                </FormGroup>
                                                <FormGroup row>
                                                    <Label for="examplePassword" sm={2}>Port</Label>
                                                    <Col sm={10}>
                                                        <Input type="number" onChange={this.paramChange} name="port"  placeholder="HTTP Port Number" />
                                                    </Col>
                                                </FormGroup>
                                                <FormGroup row>
                                                    <Label for="password" sm={2}>Password</Label>
                                                    <Col sm={10} style={{ "display": "flex" }}>
                                                        <Input type = {!this.state.hidden ? "password":"text"} onChange={this.paramChange}  name="password"  placeholder="Password" >
                                                        </Input>
                                                        <Button className="pass-button" onClick={this.toggleShow}>
                                                            <MdVpnKey />
                                                        </Button>
                                                    </Col>
                                                </FormGroup>

                                                <FormGroup check row>
                                                    <Col sm={{ size: 10, offset: 2 }}>
                                                        <Button onClick={this.handleClick} className="button">Submit</Button>
                                                    </Col>
                                                </FormGroup>
                                            </Form>

                                        </ModalBody>
                                        <ModalFooter>
                                            Connection status :{this.state.connected? " Connected": " Not Connected"} 
                                        </ModalFooter>
                                    </Modal>
                                </NavItem>

                            </Nav>
                        </Collapse>
                    </Navbar>
                </div>

                <div id="graphDock">
                    <App data={this.state} />
                </div>
            </div>
        )
    }
}


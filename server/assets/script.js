
export class HostPeerConnection {
  constructor(handleReceiveMessage, handleConnectionReady, handleConnectionBroken) {
    this.addedRemoteICE = 0;
    this.remoteSDP = null
    this.connID = null;
    this.connected = null;
    this.messageReceiveCallback = handleReceiveMessage;
    this.connectionReadyCallback = handleConnectionReady;
    this.connectionBrokenCallback = handleConnectionBroken;
    this.localConnection = new RTCPeerConnection();
    this.commandChannel = this.localConnection.createDataChannel("commandChannel");
    this.commandChannel.onmessage = this.messageReceiveCallback;
    this.commandChannel.onopen = this.handleCommandChannelStatusChange.bind(this);
    this.commandChannel.onclose = this.handleCommandChannelStatusChange.bind(this);
    this.localConnection.onicecandidate = async(e) => {
      if (e.candidate){
        console.log("genICE");
        await fetch('/api/v2/signaling/Conn/'+this.connID+'/updateData', {headers: {"dataType":"hostICE", "data": JSON.stringify(e.candidate)}});
      }
    }

  }
  async getConnID(){
    let offer = await this.localConnection.createOffer();
    let response = await fetch('/api/v2/signaling/newConn', {headers:{"SDP": JSON.stringify(offer)}});
    if (response.ok){
      await this.localConnection.setLocalDescription(offer);
      this.connID = await response.text();
      return this.connID
    }
    else{
      console.error("Failed to get Connection ID");
      return null;
    }
  }
  async connect(){
    while (!this.connected) {
      let response2 = await fetch('/api/v2/signaling/Conn/'+this.connID+'/getData');
      if (response2.ok){
        let data = await response2.json();
        if (data.answer != this.remoteSDP && data.answer != null){
          console.log("gotAns")
          this.remoteSDP = data.answer;
          await this.localConnection.setRemoteDescription(JSON.parse(data.answer));
        }

        if (data.hostICE.length != this.addedRemoteICE){
          let newICE = data.remoteICE.slice((data.remoteICE.length-this.addedRemoteICE)*-1);
          for (let i = 0; i < newICE.length; i++) {
            console.log("gotICE");
            await this.localConnection.addIceCandidate(JSON.parse(newICE[i]))//.catch(handleAddCandidateError);
            this.addedRemoteICE ++;
          }
        }
      }
      else if (response2.status == 400 && this.connected){
        console.log("Connection success!")
      }
      else{
        console.error("Failed to get Connection Info");
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async handleCommandChannelStatusChange(event) {
    console.log("status change");
    if (this.commandChannel) {
      let state = this.commandChannel.readyState;
      console.log(`Command channel's status has changed to ${state}`);

      if (state === "open") {
        this.connected = true;
        await fetch('/api/v2/signaling/Conn/'+this.connID+'/delete');
        this.connectionReadyCallback();
      } else {
        this.connected = false;
        this.connectionBrokenCallback();
      }
    }
  }

  async disconnect(){

    this.commandChannel.close();

    this.localConnection.close();

    this.localConnection = new RTCPeerConnection();
    this.commandChannel = this.localConnection.createDataChannel("commandChannel");
    this.commandChannel.onmessage = this.messageReceiveCallback;
    this.commandChannel.onopen = this.handleCommandChannelStatusChange.bind(this);
    this.commandChannel.onclose = this.handleCommandChannelStatusChange.bind(this);
    this.localConnection.onicecandidate = async(e) => {
      if (e.candidate){
        console.log("genICE");
        await fetch('/api/v2/signaling/Conn/'+this.connID+'/updateData', {headers: {"dataType":"hostICE", "data": JSON.stringify(e.candidate)}});
      }
    }
  }
}

export class ClientPeerConnection{
  constructor(connID, handleReceiveMessage, handleConnectionReady, handleConnectionBroken) {
    this.addedRemoteICE = 0;
    this.remoteSDP = null
    this.connID = connID;
    this.connected = null;
    this.messageReceiveCallback = handleReceiveMessage;
    this.connectionReadyCallback = handleConnectionReady;
    this.connectionBrokenCallback = handleConnectionBroken;
    this.localConnection = new RTCPeerConnection();
    this.commandChannel = null
    this.localConnection.ondatachannel = (event) => {
      this.commandChannel = event.channel;
      this.commandChannel.onmessage = this.messageReceiveCallback;
      this.commandChannel.onopen = this.handleCommandChannelStatusChange.bind(this);
      this.commandChannel.onclose = this.handleCommandChannelStatusChange.bind(this);
    }

    this.localConnection.onicecandidate = async(e) => {
      if (e.candidate){
        console.log("genICE");
        await fetch('/api/v2/signaling/Conn/'+this.connID+'/updateData', {headers: {"dataType":"remoteICE", "data": JSON.stringify(e.candidate)}})
      }
    }

  }

  async connect(){
    while (!this.connected) {
      let response2 = await fetch('/api/v2/signaling/Conn/'+this.connID+'/getData');
      if (response2.ok){
        let data = await response2.json();
        if (data.offer != this.remoteSDP && data.offer != null){
          console.log("gotOffer");
          this.remoteSDP = data.offer;
          await this.localConnection.setRemoteDescription(JSON.parse(data.offer));
          let ans = await this.localConnection.createAnswer();
          await this.localConnection.setLocalDescription(ans);
          await fetch('/api/v2/signaling/Conn/'+this.connID+'/updateData', {headers: {"dataType":"answer", "data": JSON.stringify(ans)}}).catch(e => console.log(e));
        }
        if (data.hostICE.length != this.addedRemoteICE){
          let newICE = data.hostICE.slice((data.hostICE.length-this.addedRemoteICE)*-1)
          for (let i = 0; i < newICE.length; i++) {
            console.log("gotICE");
            await this.localConnection.addIceCandidate(JSON.parse(newICE[i]))//.catch(handleAddCandidateError);
            this.addedRemoteICE ++;
          }
        }
      }
      else if (response2.status == 400 && this.connected){
        console.log("Connection success!")
      }
      else{
        console.error("Failed to get Connection Info");
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async handleCommandChannelStatusChange(event) {
    if (this.commandChannel) {
      let state = this.commandChannel.readyState;
      console.log(`Command channel's status has changed to ${state}`);

      if (state === "open") {
        this.connected = true;
        await fetch('/api/v2/signaling/Conn/'+this.connID+'/delete');
        this.connectionReadyCallback();
      } else {
        this.connected = false;
        this.connectionBrokenCallback();
      }
    }
  }

  async disconnect(){

    this.commandChannel.close();

    this.localConnection.close();

    this.localConnection = new RTCPeerConnection();
    this.commandChannel = null
    this.localConnection.ondatachannel = (event) => {
      this.commandChannel = event.channel;
      this.commandChannel.onmessage = this.messageReceiveCallback;
      this.commandChannel.onopen = this.handleCommandChannelStatusChange.bind(this);
      this.commandChannel.onclose = this.handleCommandChannelStatusChange.bind(this);
    }
    this.localConnection.onicecandidate = async(e) => {
      if (e.candidate){
        console.log("genICE");
        await fetch('/api/v2/signaling/Conn/'+this.connID+'/updateData', {headers: {"dataType":"remoteICE", "data": JSON.stringify(e.candidate)}})
      }
    }
  }
}

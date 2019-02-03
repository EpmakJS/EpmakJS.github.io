$(function() {
	function showMainPage() {
		document.getElementById('user-logged').style.display = 'block';
		document.getElementById('auth-form').style.display = 'none';
	}

	function showAuthPage() {
		document.getElementById('user-logged').style.display = 'none';
		document.getElementById('auth-form').style.display = 'block';
	}

	function showBlockPage() {
		document.getElementById('user-logged').style.display = 'none';
		document.getElementById('block-notification').style.display = 'block';
		document.getElementById('auth-form').style.display = 'block';
	}

	firebase.auth().onAuthStateChanged(function(user) {

		if (user) {
			let currentUser = firebase.auth().currentUser;
			let name = currentUser.displayName;
			let lastSignInTime = currentUser.metadata.lastSignInTime;
			let uid = currentUser.providerData[0].uid;

			db.collection('users').get().then((snap) => {
				if(!snap.docs.some(doc => doc.data().uid == uid)) {
					db.collection('users').add({
						name: name,
						lastVisit: lastSignInTime,
						uid: uid,
						isBlocked: false
					});
					showMainPage();
				} else if (snap.docs.some(doc => doc.data().uid == uid && !doc.data().isBlocked)) {
					showMainPage();
				} else {
					firebase.auth().signOut();
					showBlockPage();
				}
			})

		} else {
			showAuthPage();
		}
	});

	
	$("#fblogin").click(function(event){
		event.preventDefault();

		let provider = new firebase.auth.FacebookAuthProvider();
		firebase.auth().signInWithRedirect(provider);
		firebase.auth().getRedirectResult();
	});

	$("#glogin").click(function(event){
		event.preventDefault();

		let provider = new firebase.auth.GoogleAuthProvider();
		firebase.auth().signInWithRedirect(provider);
		firebase.auth().getRedirectResult();
	});

	$("#twlogin").click(function(event){
		event.preventDefault();

		let provider = new firebase.auth.TwitterAuthProvider();
		firebase.auth().signInWithRedirect(provider);
		firebase.auth().getRedirectResult();
	});
	
	$("#btn-user-logout").click(function(){
		firebase.auth().signOut();
	});

	const userList = document.querySelector('#user-list');

	function renderUser(doc) {

		let tr = document.createElement('tr');
		let td = document.createElement('td');
		let input = document.createElement('INPUT');
		let name = document.createElement('td');
		let lastVisit = document.createElement('td');

		tr.setAttribute('data-id', doc.id);
		input.setAttribute("type", "checkbox");

		name.textContent = doc.data().name;
		lastVisit.textContent = doc.data().lastVisit;

		tr.appendChild(td);
		td.appendChild(input);
		tr.appendChild(name);
		tr.appendChild(lastVisit);
		if(doc.data().isBlocked) {
			tr.style.background = '#e9544f';
		}

		userList.appendChild(tr);


		//Delete/Block/Unblock user
		let userDelete = document.querySelector('#btn-user-delete');
		let userBlock = document.querySelector('#btn-user-block');
		let userUnblock = document.querySelector('#btn-user-unblock');
		let inputs = document.querySelectorAll('tbody>tr>td>input');


		userDelete.addEventListener('click', (e) => {
			e.stopPropagation();

			inputs.forEach(function(input) {
				if (input.checked) {
					let id = input.parentElement.parentElement.getAttribute('data-id');
					db.collection('users').doc(id).delete();
				}
			})
		})

		userBlock.addEventListener('click', (e) => {
			e.stopPropagation();

			inputs.forEach(function(input) {
				if (input.checked) {
					let id = input.parentElement.parentElement.getAttribute('data-id');
					let tr = input.parentElement.parentElement;
					let docRef = db.collection("users").doc(id);

					return db.runTransaction(function(transaction) {
						return transaction.get(docRef).then(function(doc) {
							if (!doc.exists) {
								throw "Document does not exist!";
							}

							let newState = doc.data().isBlocked = true;
							transaction.update(docRef, { isBlocked: newState });
						});
					}).then(function() {
						tr.style.background ='#e9544f';
					}).catch(function(error) {
						console.log("Transaction failed: ", error);
					});
				}
			})
		})

		userUnblock.addEventListener('click', (e) => {
			e.stopPropagation();

			inputs.forEach(function(input) {
				if (input.checked) {
					let id = input.parentElement.parentElement.getAttribute('data-id');
					let docRef = db.collection("users").doc(id);

					return db.runTransaction(function(transaction) {
						return transaction.get(docRef).then(function(doc) {
							if (!doc.exists) {
								throw "Document does not exist!";
							}

							let newState = doc.data().isBlocked = false;
							transaction.update(docRef, { isBlocked: newState });
						});
					}).then(function() {
						tr.removeAttribute('style');
					}).catch(function(error) {
						console.log("Transaction failed: ", error);
					});
				}
			})
		})

	}

	db.collection('users').orderBy('lastVisit').onSnapshot(snapshot => {
		let changes = snapshot.docChanges();
		changes.forEach(change => {
			if(change.type == 'added'){
				renderUser(change.doc);
				fixCheckboxes();
			} else if (change.type == 'removed'){
				db.collection('users').get().then((snap) => {
					if(snap.docs.some(doc => doc.data().uid == firebase.auth().currentUser.providerData[0].uid)) {
						let tr = userList.querySelector('[data-id=' + change.doc.id + ']');
						userList.removeChild(tr);
						fixCheckboxes();
					} else {
						let tr = userList.querySelector('[data-id=' + change.doc.id + ']');
						userList.removeChild(tr);
						firebase.auth().signOut();
					}
				});
			} else if (change.type == 'modified') {
				db.collection('users').get().then((snap) => {
					snap.docs.forEach(doc => {
						if(doc.data().isBlocked == true) {
							if(doc.data().uid == firebase.auth().currentUser.providerData[0].uid) {
								firebase.auth().signOut();
								showBlockPage();
							}
						}
					})
				})
			}
		});
	});

	function fixCheckboxes() {
		let dataTable = document.getElementById('data-table');
		let mainCheckbox = dataTable.querySelector('input[name="select_all"]');
		let inputs = document.querySelectorAll('tbody>tr>td>input');

		inputs.forEach(function(input) {
			input.addEventListener('change', function() {
				if (this.checked) {
					mainCheckbox.checked = true;
					for (let i = 0; i < inputs.length; i++) {
						if (!inputs[i].checked) {
							mainCheckbox.checked = false;
						}
					}
				} else{
					mainCheckbox.checked = false;
				}
			});
		});

		mainCheckbox.addEventListener('change', function() {
			inputs.forEach(function(input) {
				input.checked = mainCheckbox.checked;
			});
		});
	}


});

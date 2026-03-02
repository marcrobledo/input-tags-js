/*
* Input Tags JS
* Lightweight library for adding an input tags element to your forms
* (last update: 2026-03-02)
* By Marc Robledo https://www.marcrobledo.com
* Documentation and sourcecode: https://www.marcrobledo.com/input-tags-js
*
* License:
*
* MIT License
* 
* Copyright (c) 2022-2026 Marc Robledo
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

const InputTags = (function () {
	const _slug = function (str) {
		return str.toLowerCase()
			.replace(/[\xc0\xc1\xc2\xc4\xe0\xe1\xe2\xe4]/g, 'a')
			.replace(/[\xc8\xc9\xca\xcb\xe8\xe9\xea\xeb]/g, 'e')
			.replace(/[\xcc\xcd\xce\xcf\xec\xed\xee\xef]/g, 'i')
			.replace(/[\xd2\xd3\xd4\xd6\xf2\xf3\xf4\xf6]/g, 'o')
			.replace(/[\xd9\xda\xdb\xdc\xf9\xfa\xfb\xfc]/g, 'u')

			.replace(/[\xd1\xf1]/g, 'n')
			.replace(/[\xc7\xe7]/g, 'c')

			.replace(/[\xc6\xe6]/g, 'ae')
			.replace(/\x26/g, 'and')
			.replace(/\u20ac/g, 'euro')

			.replace(/[^\w\-\:\/\|\, ]/g, '')
			.replace(/[^a-z0-9]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	};


	const _initializedInputTags = [];


	const _removeTag = function (inputTagsInfo, tagToRemove) {
		const currentTags = _getCurrentTags(inputTagsInfo);
		const indexToRemove = currentTags.findIndex((currentTag) => currentTag.id == tagToRemove.id);
		if (indexToRemove !== -1) {
			tagToRemove.inputHidden.parentElement.removeChild(tagToRemove.inputHidden);
			const labelSpan = inputTagsInfo.elementTagsContainer.children[indexToRemove];
			inputTagsInfo.elementTagsContainer.removeChild(labelSpan);
			_setInputTagsClassName(inputTagsInfo, document.activeElement === inputTagsInfo.elementInput, currentTags.length - 1);
			_updateHiddenFields(inputTagsInfo, currentTags.filter((currentTag) => currentTag.id != tagToRemove.id));
			_rebuildPopover(inputTagsInfo);
		}
	}
	const _addTag = function (inputTagsInfo, value, label) {
		const currentTags = _getCurrentTags(inputTagsInfo);

		//check if not maximum tags
		if (currentTags.length >= inputTagsInfo.maxTags)
			return false;

		//check if value is known
		const knownTag = inputTagsInfo.knownTags.find(function (knownTag) { return knownTag.id === value || knownTag.alias.indexOf(value) !== -1; });
		if (knownTag) {
			value = knownTag.id;
			label = knownTag.label;
		} else {
			//check if allow custom tags
			if (!inputTagsInfo.allowCustomTags)
				return false;

			//check if slug is in the blacklist
			const banned = inputTagsInfo.blacklist.find((blacklistTag) => value.indexOf(blacklistTag) !== -1);
			if (banned)
				return false;

			//don't allow numeric values as custom tag
			if(/^\d+$/.test(value)) //value should be a slug already here
				return false;
		}

		//check if slug is already in the input tags
		const alreadyExists = currentTags.find(function (currentTag) { return currentTag.id === value; });
		if (alreadyExists)
			return false;

		//check if any other tag with the same group exists
		if (knownTag && knownTag.group !== null) {
			const alreadyExistsGroup = currentTags.find(function (currentTag) { return currentTag.knownTag && currentTag.knownTag !== null && currentTag.knownTag.group === knownTag.group; });
			if (alreadyExistsGroup)
				return false;
		}

		const inputHidden = document.createElement('input');
		inputHidden.type = 'hidden';
		inputHidden.name = knownTag ? inputTagsInfo.tagsField : inputTagsInfo.tagsFieldCustom;
		inputHidden.value = value;

		const labelSpan = _buildTagLabelSpan(inputTagsInfo, value, label, knownTag);


		inputTagsInfo.form.appendChild(inputHidden);
		inputTagsInfo.elementTagsContainer.appendChild(labelSpan);
		_setInputTagsClassName(inputTagsInfo, document.activeElement === inputTagsInfo.elementInput, currentTags.length + 1);
		currentTags.push({id:value, knownTag: knownTag});
		_updateHiddenFields(inputTagsInfo, currentTags);

		return {
			id: value,
			label: label,
			knowTag: knownTag
		};
	};
	const _updateHiddenFields = function (inputTagsInfo, currentTags) {
		const currentAddedTagsAll = currentTags.filter((currentTag) => inputTagsInfo.initialTags.indexOf(currentTag.id) === -1);
		const currentRemovedTags = inputTagsInfo.initialTags.filter((initialTag) => !currentTags.find((currentTag) => currentTag.id == initialTag));

		inputTagsInfo.elementInputHiddenAdded.value = currentAddedTagsAll.filter((currentTag) => currentTag.knownTag !== null).map((currentTag) => currentTag.id).join(',');
		if (inputTagsInfo.elementInputHiddenAddedCustom)
			inputTagsInfo.elementInputHiddenAddedCustom.value = currentAddedTagsAll.filter((currentTag) => currentTag.knownTag === null).map((currentTag) => currentTag.id).join(',');
		inputTagsInfo.elementInputHiddenRemoved.value = currentRemovedTags.join(',');
	};
	const _getInputTags = function (inputTagsInfo) {
		return Array.from(inputTagsInfo.form.querySelectorAll('input[name="' + inputTagsInfo.tagsField + '"], input[name="' + inputTagsInfo.tagsFieldCustom + '"]'));
	};
	const _getCurrentTags = function (inputTagsInfo) {
		return _getInputTags(inputTagsInfo).map(function (input) {
			if (input.name === inputTagsInfo.tagsFieldCustom) {
				return {
					id: input.value,
					label: input.value,
					inputHidden: input,
					knownTag: null
				}
			} else {
				const knownTag = inputTagsInfo.knownTags.find((knownTag) => knownTag.id == input.value);
				return {
					id: knownTag ? knownTag.id : input.value,
					label: knownTag ? knownTag.label : input.value,
					inputHidden: input,
					knownTag: knownTag
				}
			}
		});
	}
	const _rebuildCurrentTags = function (inputTagsInfo) {
		inputTagsInfo.elementTagsContainer.innerHTML = '';
		const currentTags = _getCurrentTags(inputTagsInfo);
		currentTags.forEach(function (currentTag) {
			const labelSpan = _buildTagLabelSpan(inputTagsInfo, currentTag.id, currentTag.label, currentTag.knownTag);
			inputTagsInfo.elementTagsContainer.appendChild(labelSpan);
		});
		_setInputTagsClassName(inputTagsInfo, document.activeElement === inputTagsInfo.elementInput, currentTags.length);

		return currentTags;
	}
	const _setInputTagsClassName = function (inputTagsInfo, focused, nTags) {
		let newClassName = 'input-tags-container';
		//check if element is focused
		if (focused)
			newClassName += ' focus-within';
		if (nTags > 0)
			newClassName += ' with-tags-' + nTags;
		if (nTags >= 5)
			newClassName += ' with-tags-many';
		else if (nTags >= 3)
			newClassName += ' with-tags-few';

		inputTagsInfo.elementContainer.className = newClassName;
	}


	const _buildTagLabelSpan = function (inputTagsInfo, value, label, knownTag) {
		const tagLabelSpan = document.createElement('span');
		tagLabelSpan.className = 'input-tag input-tag-' + value;
		if (knownTag) {
			if (typeof knownTag.className === 'string')
				tagLabelSpan.className += ' input-tag-' + knownTag.className;
			else if (knownTag.group !== null)
				tagLabelSpan.className += ' input-tag-group-' + knownTag.group;
		}

		const span = document.createElement('span');
		span.innerHTML = label;

		const btnRemove = document.createElement('button');
		btnRemove.type = 'button';
		btnRemove.className = 'button-tag-remove';
		btnRemove.innerHTML = '&times;';
		btnRemove.addEventListener('click', function (evt) {
			const currentTags = _getCurrentTags(inputTagsInfo);
			const foundTag = currentTags.find((currentTag) => currentTag.id == value);
			if (foundTag)
				_removeTag(inputTagsInfo, foundTag);
		});

		tagLabelSpan.appendChild(span);
		tagLabelSpan.appendChild(btnRemove);

		return tagLabelSpan;
	}








	const _evtStopPropagation = function (evt) {
		evt.stopPropagation();
	}
	const _focus = function (inputTagsInfo) {
		_setInputTagsClassName(inputTagsInfo, true, _getInputTags(inputTagsInfo).length);
	}
	const _blur = function (inputTagsInfo) {
		if (inputTagsInfo.blurTimeout)
			window.clearTimeout(inputTagsInfo.blurTimeout);

		_setInputTagsClassName(inputTagsInfo, false, _getInputTags(inputTagsInfo).length);
		_hidePopover(inputTagsInfo);
	}
	const _blurFakeEvent = function (inputTagsInfo) {
		if (inputTagsInfo.blurTimeout)
			window.clearTimeout(inputTagsInfo.blurTimeout);
		inputTagsInfo.blurTimeout = window.setTimeout(function () {
			const focusableElements = Array.from(inputTagsInfo.elementPopover.children).concat(inputTagsInfo.elementPopover, inputTagsInfo.elementInput);
			const activeElement = document.activeElement;
			if (focusableElements.indexOf(activeElement) === -1)
				_blur(inputTagsInfo);
		}, 50);
	}
	const _showPopover = function (inputTagsInfo) {
		inputTagsInfo.elementPopover.className = 'input-tags-popover show';
	}
	const _hidePopover = function (inputTagsInfo) {
		inputTagsInfo.elementPopover.className = 'input-tags-popover';
	}

	const _rebuildPopover = function inputTagsInfo(inputTagsInfo) {
		const slug = _slug(inputTagsInfo.elementInput.value);

		const currentTags = _getCurrentTags(inputTagsInfo);
		const currentGroups = currentTags.reduce(function (acc, currentTag) {
			if (currentTag.knownTag && currentTag.knownTag.group !== null && acc.indexOf(currentTag.knownTag.group) === -1) {
				acc.push(currentTag.knownTag.group);
			}
			return acc;
		}, []);

		//find tags that contain the slug
		const regex = new RegExp(slug, 'i');
		let filteredTags = inputTagsInfo.knownTags;
		if (slug) {
			filteredTags = filteredTags.filter(function (tag) {
				return (typeof tag.id === 'string' && regex.test(tag.id)) || tag.alias.indexOf(slug) !== -1;
			});
		}
		filteredTags = filteredTags.filter((filteredTag) => {
			return !currentTags.find((currentTag) => filteredTag.id == currentTag.id)
		}).filter((filteredTag2) => {
			return filteredTag2.group === null || currentGroups.indexOf(filteredTag2.group) === -1
		}).slice(0, inputTagsInfo.maxSuggestions);

		//if no slug is provided, group available groups in a single button
		if (!slug) {
			filteredTags = filteredTags.reduce(function (acc, filteredTag) {
				if (typeof filteredTag.group === 'string') {
					if (!acc.find((accTag) => accTag.group === filteredTag.group))
						acc.push({ ...filteredTag, grouped: true });
				} else {
					acc.push(filteredTag);
				}
				return acc;
			}, []);
		}

		if (filteredTags.length) {
			inputTagsInfo.elementPopover.innerHTML = '';
			filteredTags.forEach(function (tag) {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'button-tag button-tag-' + tag.id;
				if (typeof tag.className === 'string')
					btn.className += ' button-tag-' + tag.className;
				else if (typeof tag.group === 'string')
					btn.className += ' button-tag-group-' + _slug(tag.group);
				if (tag.grouped) {
					btn.innerHTML = tag.group + '&mldr;';
					btn.addEventListener('click', function () {
						inputTagsInfo.elementInput.value = tag.group + ':';
						_rebuildPopover(inputTagsInfo);
						inputTagsInfo.elementInput.focus();
					});
				} else {
					btn.innerHTML = tag.label;
					btn.addEventListener('click', function () {
						_addTag(inputTagsInfo, tag.id, tag.label);
						inputTagsInfo.elementInput.value = '';
						inputTagsInfo.elementInput.focus();
					});
				}
				btn.addEventListener('keydown', function (evt) {
					if (evt.keyCode === 27) { //escape
						inputTagsInfo.elementInput.focus();
					} else if (evt.keyCode === 38 || evt.keyCode === 40) {
						evt.stopPropagation();
						evt.preventDefault();

						const btns = Array.from(inputTagsInfo.elementPopover.children);
						const thisIndex = btns.indexOf(this);

						if (evt.keyCode === 38) { //up
							if (thisIndex === 0)
								inputTagsInfo.elementInput.focus();
							else
								btns[thisIndex - 1].focus();
						} else { //down
							if (thisIndex === btns.length - 1)
								inputTagsInfo.elementInput.focus();
							else
								btns[thisIndex + 1].focus();
						}
					}
				});
				btn.addEventListener('blur', function (evt) {
					_blurFakeEvent(inputTagsInfo);
				});
				inputTagsInfo.elementPopover.appendChild(btn);
			});
			_showPopover(inputTagsInfo);
		} else {
			_hidePopover(inputTagsInfo);
		}
	}






	const _parseKnownTags = function (knownTags) {
		const parsed = [];
		knownTags.forEach(function (tag) {
			if (typeof tag === 'string') {
				parsed.push({
					id: _slug(tag),
					label: tag,
					alias: [_slug(tag)],
				});

			} else if (typeof tag === 'object') {
				if (typeof tag.id !== 'string' && typeof tag.id !== 'number' && typeof tag.label !== 'string')
					throw new Error('InputTags: tag with invalid id and/or label properties');

				const tagInfo = {
					id: null,
					label: null,
					alias: '',
					group: null
				};

				if (typeof tag.id === 'string' || typeof tag.id === 'number')
					tagInfo.id = tag.id;
				else
					tagInfo.id = _slug(tag.label);

				if (typeof tag.label === 'string')
					tagInfo.label = tag.label;
				else
					tagInfo.label = tag.id;

				tagInfo.alias += _slug(tagInfo.label);
				if (typeof tag.alias === 'string')
					tag.alias = [tag.alias];
				if (Array.isArray(tag.alias)) {
					tag.alias.forEach(function (alias) {
						if (typeof alias === 'string') {
							const aliasSlug = _slug(alias);
							if (aliasSlug)
								tagInfo.alias += '-' + aliasSlug;
						}
					});
				}

				if (typeof tag.group === 'string') {
					const groupSlug = _slug(tag.group);
					if (groupSlug) {
						tagInfo.group = tag.group;
						tagInfo.alias = groupSlug + '-' + tagInfo.alias;
					} else {
						console.warn('InputTags: ignoring invalid group: ' + tag.group);
					}
				} else if (typeof tag.group === 'number') {
					tagInfo.group = tag.group;
				}

				if (typeof tag.className === 'string') {
					tagInfo.className = tag.className;
				}

				parsed.push(tagInfo);
			}
		});

		return parsed;
	}






	return {
		enable: function (settings, knownTags, customTags) {
			if (typeof settings === 'string' || settings instanceof HTMLElement)
				settings = { element: settings };
			else if (typeof settings !== 'object')
				throw new Error('InputTags: no valid settings parameter provided');

			const elem = typeof settings.element === 'string' ? document.getElementById(settings.element.trim().replace('#', '')) : settings.element;
			if (!elem || !elem instanceof HTMLElement || elem.tagName !== 'INPUT' || elem.type !== 'text')
				throw new TypeError('InputTags: element is not an input[type="text"] element');
			else if (_initializedInputTags.includes(elem))
				throw new Error('InputTags: element is already an active InputTags instance');

			const form = elem.closest('form');
			if (!form)
				throw new Error('InputTags: element does not belong to a <form> element');




			/* sanitize settings */
			const tagsField = (typeof settings.name === 'string' ? settings.name.replace(/[^0-9a-zA-Z_\-]/g, '') : 'tags') + '[]';
			if (!tagsField || /^\d/.test(tagsField))
				throw new Error('InputTags: no valid settings.name property provided');

			const maxTags = typeof settings.maxTags === 'number' && settings.maxTags >= 0 ? Math.floor(settings.maxTags) : 10;

			const maxSuggestions = typeof settings.maxSuggestions === 'number' && settings.maxSuggestions > 0 && settings.maxSuggestions <= 20 ? Math.floor(settings.maxSuggestions) : 20;

			if (typeof customTags === 'string')
				customTags = { name: customTags };
			else if (!!customTags && typeof customTags !== 'object')
				customTags = { name: tagsField + '_custom' };
			let tagsFieldCustom;
			if (typeof customTags === 'object') {
				tagsFieldCustom = (typeof customTags.name === 'string' ? customTags.name.replace(/[^0-9a-zA-Z_\-]/g, '') : 'tags_custom') + '[]';
				if (!tagsFieldCustom || /^\d/.test(tagsFieldCustom))
					throw new Error('InputTags: no valid customTags.name property provided');

				if (tagsField === tagsFieldCustom)
					console.warn('InputTags: customTags.name is the same as settings.name');

				if (typeof customTags.blacklist === 'string')
					customTags.blacklist = [customTags.blacklist];
				if (Array.isArray(customTags.blacklist)) {
					customTags.blacklist = customTags.blacklist.filter((bannedTag) => typeof bannedTag === 'string' && _slug(bannedTag)).map((bannedTag) => _slug(bannedTag));
				}
			} else {
				tagsFieldCustom = false;
			}

			elem.autocomplete = 'off';
			const inputTagsInfo = {
				form: form,
				tagsField: tagsField,
				tagsFieldCustom: tagsFieldCustom,

				elementInput: elem,
				elementContainer: document.createElement('div'),
				elementTagsContainer: document.createElement('div'),
				elementPopover: document.createElement('div'),
				blurTimeout: null,

				knownTags: [],
				blacklist: [],

				initialTags: [],
				elementInputHiddenAdded: document.createElement('input'),
				elementInputHiddenAddedCustom: tagsFieldCustom? document.createElement('input') : null,
				elementInputHiddenRemoved: document.createElement('input'),

				allowCustomTags: !!tagsFieldCustom,
				maxTags: maxTags,
				maxSuggestions: maxSuggestions
			}

			if (Array.isArray(knownTags))
				inputTagsInfo.knownTags = _parseKnownTags(knownTags);

			if (customTags && Array.isArray(customTags.blacklist))
				inputTagsInfo.blacklist = customTags.blacklist;

			inputTagsInfo.elementInput.parentElement.replaceChild(inputTagsInfo.elementContainer, inputTagsInfo.elementInput);
			inputTagsInfo.elementContainer.appendChild(inputTagsInfo.elementTagsContainer);
			inputTagsInfo.elementContainer.appendChild(document.createElement('div'));
			inputTagsInfo.elementContainer.children[0].className = 'input-tags-container-tags';
			inputTagsInfo.elementContainer.children[1].className = 'input-tags-container-input';
			inputTagsInfo.elementContainer.children[1].appendChild(inputTagsInfo.elementInput);
			inputTagsInfo.elementContainer.children[1].appendChild(inputTagsInfo.elementPopover);

			inputTagsInfo.elementPopover.className = 'input-tags-popover';



			inputTagsInfo.elementInput.addEventListener('focus', function (evt) {
				_focus(inputTagsInfo);
				_rebuildPopover(inputTagsInfo);
			});
			if (document.activeElement instanceof HTMLElement) {
				inputTagsInfo.elementInput.addEventListener('blur', function (evt) {
					_blurFakeEvent(inputTagsInfo);
				});
			}
			inputTagsInfo.elementContainer.addEventListener('click', _evtStopPropagation);
			document.body.addEventListener('click', function (evt) {
				_blur(inputTagsInfo);
			});





			elem.addEventListener('input', function (evt) {
				_rebuildPopover(inputTagsInfo);
			});
			elem.addEventListener('keydown', function (evt) {
				if (evt.keyCode === 13)
					evt.preventDefault();

				if ((evt.keyCode === 38 || evt.keyCode === 40) && inputTagsInfo.elementPopover.children.length) { //up or down
					evt.preventDefault();

					if (evt.keyCode === 38) { //up
						inputTagsInfo.elementPopover.children[inputTagsInfo.elementPopover.children.length - 1].focus();
					} else { //down
						inputTagsInfo.elementPopover.children[0].focus();
					}
				} else if (evt.keyCode === 13 && inputTagsInfo.elementPopover.className.indexOf('show') !== -1 && inputTagsInfo.elementPopover.children.length === 1) { //enter with one suggestion
					inputTagsInfo.elementPopover.children[0].click();
					_rebuildPopover(inputTagsInfo);
				} else if (evt.keyCode === 13 || evt.keyCode === 188) { //enter or comma
					let added=0;
					const newTags = elem.value.split(',');
					newTags.forEach(function (newTag) {
						const slug = _slug(newTag);
						if (slug) {
							const result = _addTag(inputTagsInfo, slug, newTag);
							if (result) {
								elem.value = '';
								added++;
							}
						}
					});
					if (added){
						if (evt.keyCode === 188)
							evt.preventDefault();
						_rebuildPopover(inputTagsInfo);
					}
				} else if (evt.keyCode === 8 && this.selectionStart === 0) {
					const currentTags = _getCurrentTags(inputTagsInfo);
					if (evt.keyCode === 8 && this.selectionStart === 0 && currentTags.length) {
						//when backspace is pressed and cursor is at the start of the input
						const lastTag = currentTags.pop();
						_removeTag(inputTagsInfo, lastTag);
					}
				}
			});
			elem.addEventListener('input', function (evt) {
				if (this.value.indexOf(',') > 0) {
					let added=0;
					const newTags = elem.value.split(',');
					newTags.forEach(function (newTag) {
						const slug = _slug(newTag);
						if (slug) {
							const result = _addTag(inputTagsInfo, slug, newTag);
							if (result) {
								elem.value = '';
								added++;
							}
						}
					});
					if (added){
						if (evt.keyCode === 188)
							evt.preventDefault();
						_rebuildPopover(inputTagsInfo);
					}
				}
			});

			inputTagsInfo.initialTags = _rebuildCurrentTags(inputTagsInfo).map((currentTag) => currentTag.id);
			inputTagsInfo.elementInputHiddenAdded.type = 'hidden';
			inputTagsInfo.elementInputHiddenAdded.name = tagsField.replace('[]', '_added');
			inputTagsInfo.elementInputHiddenAdded.value='';
			inputTagsInfo.form.appendChild(inputTagsInfo.elementInputHiddenAdded);
			if (inputTagsInfo.elementInputHiddenAddedCustom){
				inputTagsInfo.elementInputHiddenAddedCustom.type = 'hidden';
				inputTagsInfo.elementInputHiddenAddedCustom.name = tagsField.replace('[]', '_added_custom');
				inputTagsInfo.elementInputHiddenAddedCustom.value='';
				inputTagsInfo.form.appendChild(inputTagsInfo.elementInputHiddenAddedCustom);
			}
			inputTagsInfo.elementInputHiddenRemoved.type = 'hidden';
			inputTagsInfo.elementInputHiddenRemoved.name = tagsField.replace('[]', '_removed');
			inputTagsInfo.elementInputHiddenRemoved.value='';
			inputTagsInfo.form.appendChild(inputTagsInfo.elementInputHiddenRemoved);

			_initializedInputTags.push(elem);

			return {
				addTag: function (value, label) {
					const valueSlug = _slug(value.toString());
					const knownTag = inputTagsInfo.knownTags.find(function (knownTag) { return knownTag.id === value || knownTag.alias.indexOf(valueSlug) !== -1; });
					if (knownTag) {
						return _addTag(inputTagsInfo, knownTag.id);
					} else {
						if (!label)
							label = value;
						return _addTag(inputTagsInfo, value, label);
					}
					return null;
				},
				removeTag: function (value) {
					const currentTags = _getCurrentTags(inputTagsInfo);
					const foundTag = currentTags.find((currentTag) => currentTag.id == value);
					if (foundTag) {
						_removeTag(inputTagsInfo, foundTag);
						return foundTag;
					} else {
						const valueSlug = _slug(value.toString());
						if (valueSlug) {
							const foundTag2 = currentTags.find((currentTag) => currentTag.knownTag && currentTag.knownTag.alias.indexOf(valueSlug) !== -1);
							if (foundTag2) {
								_removeTag(inputTagsInfo, foundTag2);
								return foundTag2;
							}
						}
					}
					return null;
				},
				removeTagByIndex: function (index) {
					const currentTags = _getCurrentTags(inputTagsInfo);
					if (index < currentTags.length)
						_removeTag(inputTagsInfo, currentTags[index]);
					return currentTags[index];
				},
				removeTags: function () {
					const currentTags = _getCurrentTags(inputTagsInfo);
					currentTags.forEach(function (currentTag) {
						_removeTag(inputTagsInfo, currentTag);
					});
					return currentTags;
				},
				getCurrentTags: function () {
					return _getCurrentTags(inputTagsInfo);
				},
				getStats: function () {
					return _getCurrentTags(inputTagsInfo);
				},

				setKnownTags: function (knownTags) {
					inputTagsInfo.knownTags = _parseKnownTags(knownTags);
					return inputTagsInfo.knownTags;
				},

				refresh: function () {
					_rebuildCurrentTags(inputTagsInfo);
				}
			}
		}
	}
}());

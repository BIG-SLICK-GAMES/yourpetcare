from django import forms
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib import messages
from .models import Pet
from .forms import PetForm


class PetPhotoForm(PetForm):
    class Meta:
        model = Pet
        fields = ['photo']
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['photo'].required = True
        self.fields['photo'].widget = forms.FileInput(attrs={'accept':'image/*'})
        self.fields['photo'].label = 'Choose a photo of your pet'


def upload_photo(request, pk):
    pet = get_object_or_404(Pet, pk=pk, owner=request.user)
    form = PetPhotoForm(request.POST or None, request.FILES or None, instance=pet)
    if request.method == 'POST' and form.is_valid():
        form.instance.avatar_key = ''
        form.save()
        messages.success(request, f'{pet.name}’s photo is waiting for admin approval.')
        return redirect('pets')
    return render(request, 'care/photo_upload.html', {'form':form, 'pet':pet})


def choose_picture(request, pk):
    from .pet_pictures import PICTURES, picture_matches
    pet = get_object_or_404(Pet, pk=pk, owner=request.user)
    query = request.GET.get('q','').strip()[:80]
    if request.method == 'POST':
        key = request.POST.get('picture','')
        if key not in {item[0] for item in PICTURES}:
            return render(request, 'care/picture_library.html', {'pet':pet,'pictures':picture_matches(query),'query':query,'error':'Choose a picture from the library.'}, status=400)
        pet.avatar_key = key
        pet.photo = ''
        pet.save()
        messages.success(request, 'Pet picture saved.')
        return redirect('pets')
    return render(request, 'care/picture_library.html', {'pet':pet, 'pictures':picture_matches(query), 'query':query})
